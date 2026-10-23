import {authorizedRequestOrigin,isLocalOriginAlias} from '../src/request-origin.js';
const reads=new Set(['health','providers','jobs','jobs/catalogue','jobs/employers','jobs/sources']);
const writes=new Set(['jobs/employers','jobs/refresh','jobs/lookup','ai/job','ai/compare','ai/rewrite','ai/screen','ai/supporting']);
const json=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
/** Invoke the actual local handler without opening a second HTTP server. */
export async function guestResponse(request,path,handler,origin,{allowLocalAliases=false}={}){const url=new URL(request.url);if(url.origin!==origin&&!(allowLocalAliases&&isLocalOriginAlias(url.origin,origin)))return json(403,'Request origin is not allowed.');const authorized=authorizedRequestOrigin(request,origin,{allowLocalAliases,requireOrigin:request.method!=='GET'});if(!authorized)return json(403,'Request origin is not allowed.');if(!(request.method==='GET'?reads:request.method==='POST'?writes:new Set()).has(path))return json(404,'Guest endpoint not found.');
const headers={host:new URL(authorized).host};for(const name of ['content-type','origin'])if(request.headers.has(name))headers[name]=request.headers.get(name);
const input={method:request.method,url:'/api/'+path+url.search,headers,async *[Symbol.asyncIterator](){if(request.body)for await(const chunk of request.body)yield Buffer.from(chunk);}};
let response,status=200,responseHeaders={};const output={headersSent:false,writeHead(code,values){status=code;responseHeaders=values;this.headersSent=true;return this;},end(body){response=new Response(body,{status,headers:{...responseHeaders,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}};
try{await handler(input,output);return response||json(503,'The local guest service could not complete this request.');}catch{return json(503,'The local guest service could not complete this request.');}}
