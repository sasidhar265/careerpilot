import {defineConfig} from 'vite';
function apiProxy(){return {'/api':{
 target:'http://127.0.0.1:3001',changeOrigin:false,
 configure(proxy){proxy.on('error',(_error,_req,res)=>{
 if(res&&!res.headersSent&&typeof res.writeHead==='function'){
 res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify({error:'The AI backend is unavailable. Restart the app with npm run dev (or npm start for a production preview).'}));
 }
 });}
}};}
export default defineConfig({server:{host:'127.0.0.1',proxy:apiProxy()},preview:{host:'127.0.0.1',proxy:apiProxy()}});
