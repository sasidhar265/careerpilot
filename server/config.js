import {existsSync,readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export function loadConfiguration({root=projectRoot,env=process.env}={}){
 // Resolve files from this project, regardless of the terminal's current folder.
 const files=['server/.env','.env','.env.local'];
 const values={};const loaded=[];
 for(const relative of files){const path=resolve(root,relative);if(!existsSync(path))continue;try{Object.assign(values,parseEnv(readFileSync(path,'utf8').replace(/^\uFEFF/,'')));loaded.push(relative);}catch{throw new Error(`Cannot load ${relative}. Check the file format and permissions.`);}}
 // A blank inherited variable must not hide a value supplied in a file.
 for(const key of ['OPENAI_API_KEY','OPENAI_MODEL','AI_PROVIDER','CODEX_MODEL','CODEX_CLI_PATH','COPILOT_CLI_PATH','COPILOT_MODEL','COPILOT_GITHUB_TOKEN','NHS_JOBS_FEED_URL','JOB_REFRESH_MINUTES','JOB_AUTO_REFRESH','JOB_EMPLOYER_BOARDS'])if(!env[key]?.trim()&&values[key]?.trim())env[key]=values[key].trim();
 return {configured:Boolean(env.OPENAI_API_KEY?.trim()),model:env.OPENAI_MODEL?.trim()||'gpt-4.1',loaded};
}
