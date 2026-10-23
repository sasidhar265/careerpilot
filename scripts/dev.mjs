import {existsSync} from 'node:fs';
import {startBackend} from './backend-process.mjs';
import {loadConfiguration,projectRoot} from '../server/config.js';
process.chdir(projectRoot);
const configurationEnv={...process.env};
const configuration=loadConfiguration({env:configurationEnv});
const productionPreview=process.argv.includes('--preview');
const guestMode=process.argv.includes('--guest');
if(productionPreview&&!existsSync('dist/index.html'))throw new Error('Run npm run build before npm start.');
const {createServer,preview}=await import('vite');
const backend=startBackend({watch:!productionPreview&&!guestMode});
await backend.started;
try{
 const frontend=productionPreview?await preview():await createServer();
 if(!productionPreview)await frontend.listen();
 frontend.printUrls();
 if(guestMode)console.log('Guest workspace: '+new URL('?guest=1',frontend.resolvedUrls?.local?.[0]||'http://localhost:5173/').href);
 console.log(['codex','copilot'].includes(configurationEnv.AI_PROVIDER)?`Default AI provider: ${configurationEnv.AI_PROVIDER} (uses existing CLI login).`:configuration.configured?`AI configured (${configuration.model}).`:`AI is not configured. Checked ${projectRoot}.env, .env.local, and server/.env for OPENAI_API_KEY.`);
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{
 if(productionPreview)frontend.httpServer.close();else await frontend.close();
 backend.stop();process.exit(0);
 });
}catch(e){backend.stop();throw e;}
