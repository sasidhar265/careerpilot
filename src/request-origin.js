const loopback=new Set(['localhost','127.0.0.1','[::1]']);
function originUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash&&value===url.origin?url:null;}catch{return null;}}
/** Local aliases must keep the configured scheme and port; never use wildcards. */
export function isLocalOriginAlias(value,configuredOrigin){const candidate=originUrl(value),configured=originUrl(configuredOrigin);return Boolean(candidate&&configured&&loopback.has(candidate.hostname)&&loopback.has(configured.hostname)&&candidate.protocol===configured.protocol&&candidate.port===configured.port);}
export function authorizedRequestOrigin(request,configuredOrigin,{allowLocalAliases=false,requireOrigin=true}={}){
 let target;try{target=new URL(request.url);}catch{return null;}
 if(request.headers.get('sec-fetch-site')==='cross-site')return null;
 const supplied=request.headers.get('origin');if(!supplied&&requireOrigin)return null;
 const candidate=originUrl(supplied||target.origin);if(!candidate||!originUrl(configuredOrigin))return null;
 if(!allowLocalAliases||!isLocalOriginAlias(configuredOrigin,configuredOrigin))return candidate.origin===configuredOrigin?candidate.origin:null;
 if(!isLocalOriginAlias(candidate.origin,configuredOrigin)||!isLocalOriginAlias(target.origin,configuredOrigin))return null;
 const authority=request.headers.get('host')||target.host;
 return authority.toLowerCase()===candidate.host?candidate.origin:null;
}
