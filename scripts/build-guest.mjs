import {build} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({root,configFile:false,base:'/guest-assets/',build:{outDir:fileURLToPath(new URL('../apps/careerpilot-ai/public/guest-assets/',import.meta.url)),emptyOutDir:true}});
