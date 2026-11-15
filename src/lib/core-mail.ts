/** Verified private-project mail only. No sign-in publication or supplier flow is reused. */
import {CoreError} from './core-phase1';
export const privateMailEnabled=()=>process.env.NETIFY_CORE_MAIL_MODE==='live'&&process.env.NETIFY_CORE_MAIL_READY==='1'&&process.env.NETIFY_CORE_SECURITY_TRACKING_OFF==='1';
export async function sendPrivateVerification(payload:{to:string;subject:string;url:string},id:string){
 if(!privateMailEnabled()||!process.env.RESEND_API_KEY)throw new CoreError(503,'private_mail_not_enabled');
 const testTo=process.env.NETIFY_CORE_MAIL_TEST_TO?.trim().toLowerCase();if(testTo&&payload.to!==testTo)throw new CoreError(503,'owner_mail_test_only');
 const u=new URL(payload.url);if(u.protocol!=='https:'||!(u.hostname==='netify.co.uk'||process.env.VERCEL_ENV==='preview'&&u.host===process.env.VERCEL_URL)||!u.hash.startsWith('#verify='))throw new CoreError(422,'invalid_private_mail_link');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+process.env.RESEND_API_KEY,'content-type':'application/json','idempotency-key':'netify-private-'+id},body:JSON.stringify({from:'Netify <no-reply@mail.netify.co.uk>',to:[payload.to],subject:payload.subject,text:'Confirm access to your private Netify project:\n\n'+payload.url+'\n\nThis link expires in 15 minutes. It does not publish your project or authorise supplier contact. If you did not request it, ignore this message.'}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new CoreError(503,'private_mail_delivery_not_confirmed');const result=await response.json();if(typeof result.id!=='string')throw new CoreError(503,'private_mail_delivery_not_confirmed');return {accepted:true,delivery_id:result.id};
}
