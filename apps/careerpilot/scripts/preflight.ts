import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {inspectConfiguration} from '../src/lib/deployment.ts';
const environment=fileURLToPath(new URL('../.env',import.meta.url));
// Never read the repository-root legacy .env and never print actual configuration values.
if(existsSync(environment))process.loadEnvFile(environment);
const configuration=inspectConfiguration(process.env,process.argv.includes('--production')),lockfile=existsSync(fileURLToPath(new URL('../package-lock.json',import.meta.url))),generatedClient=existsSync(fileURLToPath(new URL('../src/generated/prisma/client.ts',import.meta.url)));
console.log(JSON.stringify({configuration,lockfile,generatedClient,releaseReady:false,note:'Preflight does not establish runtime verification. Run the release checks and live integration smoke tests.'},null,2));
if(!configuration.ready||!lockfile||!generatedClient)process.exitCode=1;
