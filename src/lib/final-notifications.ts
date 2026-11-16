import 'server-only';
import {coreDatabase,sha} from './core-phase1';
import {sealPrivate,openPrivate} from './core-identity';
import {finalEnabled,platformOwner} from './final-platform-flags';
export type OwnerNotification='project_claimed'|'request_approved_and_sent'|'reseller_enquiry_sent'|'legacy_signup'|'legacy_opportunity_published'|'daily_summary';
export async function queueOwnerNotification(kind:OwnerNotification,reference:string,projectId:string|null=null){
 if(!finalEnabled('owner'))return;
 const id=sha(kind+':'+(kind==='daily_summary'?reference.slice(0,10):reference));await coreDatabase().query('INSERT INTO netify_core_phase1.owner_notifications(id,kind,project_id,payload_cipher) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,kind,projectId,sealPrivate({reference})]);if(process.env.NETIFY_PLATFORM_OWNER_MAIL_MODE==='live')await deliverOwnerNotifications();
}
/** Owner-only transport. Captures on previews; provider acceptance is not delivery. */
export async function deliverOwnerNotifications(){
 if(!finalEnabled('owner'))return {status:'not_enabled'};
 const sql=coreDatabase(),rows=await sql.query("SELECT id,kind,payload_cipher FROM netify_core_phase1.owner_notifications WHERE status='queued' OR status='failed' AND next_attempt_at<=clock_timestamp() ORDER BY at LIMIT 100",[]),results=[];
 for(const r of rows){const payload=openPrivate(r.payload_cipher);
  if(process.env.NETIFY_PLATFORM_OWNER_MAIL_MODE!=='live'){results.push({id:r.id,status:'captured_not_sent'});continue;}
  if(!process.env.RESEND_API_KEY)throw Error('owner_mail_not_configured');
  const claimed=await sql.query("UPDATE netify_core_phase1.owner_notifications SET status='sending',attempts=attempts+1,attempted_at=clock_timestamp() WHERE id=$1 AND status IN ('queued','failed') RETURNING id",[r.id]);if(!claimed.length)continue;
  try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+process.env.RESEND_API_KEY,'content-type':'application/json','idempotency-key':'netify-owner-'+r.id},body:JSON.stringify({from:'Netify <no-reply@mail.netify.co.uk>',to:[platformOwner()],subject:'Netify: '+r.kind.replaceAll('_',' '),text:'Event: '+r.kind+'\nReference: '+payload.reference+'\n\nReview privately: https://netify.co.uk/sase/admin/platform/'}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('provider_rejected');const sent=await response.json();if(typeof sent.id!=='string')throw Error('receipt_missing');await sql.query("UPDATE netify_core_phase1.owner_notifications SET status='accepted',delivery_id=$2,next_attempt_at=NULL WHERE id=$1",[r.id,sent.id]);results.push({id:r.id,status:'accepted'});}
  catch{await sql.query("UPDATE netify_core_phase1.owner_notifications SET status='awaiting_delivery_confirmation',next_attempt_at=NULL WHERE id=$1",[r.id]);results.push({id:r.id,status:'awaiting_delivery_confirmation'});}
 }return {recipient:platformOwner(),results};
}
export async function recordOwnerDelivery(deliveryId:string,event:string){if(!['email.delivered','email.bounced','email.complained'].includes(event))return;const status=event==='email.delivered'?'delivered':event==='email.bounced'?'bounced':'suppressed';await coreDatabase().query('UPDATE netify_core_phase1.owner_notifications SET status=$2,next_attempt_at=NULL WHERE delivery_id=$1',[deliveryId,status]);}
export async function dailyOwnerSummary(){if(!finalEnabled('owner'))return {status:'not_enabled'};const day=new Date(Date.now()-86400000).toISOString().slice(0,10);const rows=await coreDatabase().query("SELECT event,count(*)::integer AS count FROM netify_core_phase1.platform_events WHERE at >= $1::date AND at < $1::date+interval '1 day' AND NOT excluded AND event IN ('scope_started','scope_saved') GROUP BY event",[day]);if(rows.length)await queueOwnerNotification('daily_summary',day+': '+rows.map(r=>r.event+'='+r.count).join(', '));return deliverOwnerNotifications();}
