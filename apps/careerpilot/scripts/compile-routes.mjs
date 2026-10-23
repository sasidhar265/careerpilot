import {mkdtemp,mkdir,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
/** Actual Next/Turbopack regression gate without a database or generated ORM code. */
export async function compileRoutes({name,sources,page,extraFiles={},verify}){const app=fileURLToPath(new URL('..',import.meta.url)),root=resolve(app,'../..'),probe=await mkdtemp(join(app,'.route-compile-check-'));try{
 await mkdir(join(probe,'app'),{recursive:true});
 for(const source of sources){const target=join(probe,source.replace(/^src\//,''));await mkdir(dirname(target),{recursive:true});await writeFile(target,await readFile(join(app,source)));}
 for(const [file,content] of Object.entries(extraFiles)){const target=join(probe,file);await mkdir(dirname(target),{recursive:true});await writeFile(target,content);}
 await writeFile(join(probe,'app/layout.tsx'),'export default function Layout({children}:{children:React.ReactNode}){return <html><body>{children}</body></html>}');
 if(!sources.includes('src/app/page.tsx'))await writeFile(join(probe,'app/page.tsx'),page||'export default function Page(){return <p>Isolated route compilation check</p>}');
 await writeFile(join(probe,'package.json'),JSON.stringify({name,private:true}));
 await writeFile(join(probe,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',lib:['dom','es2022'],jsx:'react-jsx',module:'esnext',moduleResolution:'bundler',esModuleInterop:true,allowJs:true,skipLibCheck:true,paths:{'@/*':['../src/*'],'@legacy/*':['../../../*']}},include:['app/**/*.ts','app/**/*.tsx']}));
 await writeFile(join(probe,'next.config.mjs'),'export default '+JSON.stringify({turbopack:{root},serverExternalPackages:['pg','mammoth','pdfjs-dist','docx','jspdf'],poweredByHeader:false})+';');
 await symlink(join(app,'node_modules'),join(probe,'node_modules'),'dir');
 const result=spawnSync(process.execPath,[join(app,'node_modules/next/dist/bin/next'),'build',probe,'--experimental-build-mode','compile',...(process.env.CAREERPILOT_CHECK_BUNDLER==='webpack'?['--webpack']:[])],{env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:'inherit',timeout:180000});if(result.error)console.error('The isolated route compiler could not complete.');if(result.status===0&&verify)await verify(probe);return result.status??1;
}finally{await rm(probe,{recursive:true,force:true});}}
