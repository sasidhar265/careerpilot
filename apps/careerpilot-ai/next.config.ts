import type {NextConfig} from 'next';
import path from 'node:path';
const config:NextConfig={output:'standalone',outputFileTracingRoot:path.resolve(process.cwd(),'../..'),serverExternalPackages:['cheerio','pg','mammoth','pdfjs-dist','docx','jspdf'],poweredByHeader:false,outputFileTracingIncludes:{'/*':['../../node_modules/pdfjs-dist/**','./node_modules/pdfjs-dist/**','../../node_modules/mammoth/**','./node_modules/mammoth/**']},
 async rewrites(){return {beforeFiles:[{source:'/guest-assets/index.html',destination:'/guest'}]};},
 async headers(){return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]}];}};
export default config;
