/** Only the live platform adapter uses these exact, owner-approved status corrections. */
export const FINAL_STATUS_STRINGS=[
 ['Private local project','Private project'],['Private local draft','Private draft'],['Private local mockup','Private project'],['Context room','Marketplace'],
 ['Local preview: publication, messaging and demo booking are not enabled.','Supplier contact requires your approval.'],
 ['Local preview: shortlisting and RFP drafting are connected. Publication and supplier responses are not enabled.','Supplier contact requires your approval.'],
 ['get bids from 30+ curated partners','prepare a sourcing request'],['Get Bids from 30+ curated Partners','Prepare a sourcing request'],
 ['30+ curated partners','30 researched providers'],['30+ curated Partners','30 researched providers'],['curated partners','researched providers'],
] as const;
export function honestPlatformStatus(source:string){let result=source;for(const [before,after] of FINAL_STATUS_STRINGS)result=result.replaceAll(before,after);return result;}
export const finalPlatformClient=String.raw`(()=>{
 const root=document.documentElement,seen=new Set(),participation=new Map();fetch('/sase/api/platform/provider-status/').then(r=>r.json()).then(d=>{for(const row of d.labels??[])participation.set(row.id,row.label);labels();}).catch(()=>{});
 function labels(){if(root.dataset.finalStatus!=='true')return;for(const button of document.querySelectorAll('.ls-border-provider[data-ls-evidence]')){let label=button.querySelector('[data-participation-label]');if(!label){label=document.createElement('small');label.dataset.participationLabel='';button.append(label);}const text=participation.get(button.dataset.lsEvidence)||'Researched provider';if(label.textContent!==text)label.textContent=text;}}
 async function event(name){if(root.dataset.finalFunnel!=='true')return;const id=new URL(location.href).searchParams.get('core');if(!id||id==='new')return;const cap=sessionStorage.getItem('netify-core-capability:'+id);if(!cap)return;const key=id+':'+name;if(seen.has(key))return;seen.add(key);try{const r=await fetch('/sase/api/platform/events/',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+cap},body:JSON.stringify({project_id:id,event:name,operation_id:crypto.randomUUID()})});if(!r.ok)seen.delete(key);}catch{seen.delete(key);}}
 document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;if(b.matches('[data-ls="providers"]')&&document.querySelector('.ls-border-provider[data-fit="fit"],.ls-border-provider[data-fit="suited"]'))void event('provider_assessment_viewed');if(b.matches('[data-ls="rfp"],[data-task="written-brief"]'))void event('rfp_generated');if(b.closest('#ns-living-rfp')&&/export|download|word/i.test(b.textContent)&&!/backup|csv/i.test(b.textContent))void event('rfp_exported');});
 new MutationObserver(labels).observe(document.body,{childList:true,subtree:true});labels();
})();`;
