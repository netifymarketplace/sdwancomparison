import 'server-only';
import {coreLiveEnabled,coreCanonicalOrigin,coreOriginAllowed,coreEnvironment} from './core-host';
import {privateMailEnabled} from './core-mail';
import {Readable} from 'node:stream';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {contextPreviewHandler} from '../../scripts/context-space-preview';
/** Serve the existing platform source. No replacement design or duplicated application. */
export async function platformWeb(request:Request){
 const u=new URL(request.url),assetPrefix='/sase/locations/assets/',relativePath=u.pathname.replace(/^\/sase(?=\/)/,''),isAsset=relativePath.startsWith('/locations/assets/'),rawPath=isAsset?'/'+relativePath.slice('/locations/assets/'.length):u.pathname.replace(/^\/sase(?=\/)/,''),raw=rawPath.startsWith('/api/context-preview')?rawPath.replace(/\/$/,''):rawPath;
 if((raw==='/locations/'||raw==='/locations')&&!u.searchParams.has('core')&&!u.searchParams.has('partner_project')){const target=new URL(coreCanonicalOrigin(u.origin)+'/sase/locations/');target.search=u.search;target.searchParams.set('core','new');return Response.redirect(target,302);}
 if(!process.env.VERCEL_ENV||process.env.VERCEL_ENV==='preview'||coreLiveEnabled()){
  if(!coreOriginAllowed(u.origin))return Response.json({error:'origin_not_allowed'},{status:403});
  const servingOrigin=coreCanonicalOrigin(u.origin);
  const bytes=request.method==='GET'||request.method==='HEAD'?null:new Uint8Array(await request.arrayBuffer());if(bytes&&bytes.byteLength>5_000_000)return Response.json({error:'request_too_large'},{status:413});
  const req=Object.assign(Readable.from(bytes?[Buffer.from(bytes)]:[]),{method:request.method,url:raw+u.search,headers:{...Object.fromEntries(request.headers),host:new URL(servingOrigin).host},socket:{remoteAddress:request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'platform-adapter'}}) as unknown as IncomingMessage;
  let status=200;const headers=new Headers(),chunks:Buffer[]=[];
  const res={setHeader:(k:string,v:any)=>{headers.set(k,String(v));return res;},writeHead:(code:number,values?:Record<string,string>)=>{status=code;for(const [k,v]of Object.entries(values??{}))headers.set(k,v);return res;},write:(b:any)=>{chunks.push(Buffer.from(b));return true;},end:(b?:any)=>{if(b!==undefined)chunks.push(Buffer.from(b));}} as unknown as ServerResponse;
  await contextPreviewHandler(req,res,servingOrigin);let output=Buffer.concat(chunks);
  if(isAsset||raw==='/locations/'||raw==='/locations'){
   const type=headers.get('content-type')??'';
   if(type.includes('text/html')||type.includes('javascript')||type.includes('text/css')){
    let text=output.toString('utf8');text=text.replaceAll('/api/context-preview','/sase/api/context-preview').replaceAll("'/locations/","'/sase/locations/").replaceAll('"/locations/','"/sase/locations/');
    if(isAsset&&raw==='/client.js'){text=text.replaceAll("location.pathname.startsWith(path)","location.pathname.replace(/^\\/sase(?=\\/)/,'').startsWith(path)");text=text.replaceAll("location.pathname.replace(/\\/$/,'')", "location.pathname.replace(/^\\/sase(?=\\/)/,'').replace(/\\/$/,'')");}
    if(type.includes('text/html'))text=text.replace('<html','<html data-core-environment="'+coreEnvironment()+'" data-core-mail-enabled="'+String(privateMailEnabled())+'" data-core-desk-enabled="'+String(process.env.NETIFY_CORE_DESK_ENABLED==='1')+'"');
    if(type.includes('text/html'))text=text.replace(/(src|href)="\/(?!sase\/|\/|https?:)([^"?#]+\.(?:js|css))("|\?)/g,'$1="'+assetPrefix+'$2$3');
    output=Buffer.from(text);
   }
  }
  headers.delete('content-length');headers.set('cache-control','private, no-store');headers.set('x-robots-tag','noindex, nofollow');headers.set('referrer-policy','no-referrer');return new Response(output,{status,headers});
 }
 return Response.json({error:'platform_release_not_enabled'},{status:503,headers:{'cache-control':'no-store'}});
}
