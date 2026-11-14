/** Exact-origin preview support. Production remains disabled until the approved migration stage. */
export function coreOriginAllowed(origin:string){const u=new URL(origin);if(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))return true;return process.env.VERCEL_ENV==='preview'&&u.protocol==='https:'&&[process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL].filter(Boolean).includes(u.host);}
export const coreLocationPath=()=>(process.env.VERCEL_ENV||process.env.NETIFY_CORE_WEB_BASEPATH==='/sase')?'/sase/locations/':'/locations/';
