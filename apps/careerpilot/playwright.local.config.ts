import {defineConfig,devices} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const directory=mkdtempSync(join(tmpdir(),'careerpilot-local-e2e-'));
export default defineConfig({testDir:'./tests/local-e2e',workers:1,retries:0,timeout:60000,metadata:{fileAuthTestDirectory:directory},globalTeardown:'./tests/support/file-auth-cleanup.mjs',use:{baseURL:'http://localhost:3102',trace:'retain-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],webServer:{command:'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3102',url:'http://localhost:3102/',reuseExistingServer:false,timeout:120000,env:{APP_URL:'http://localhost:3102',AUTH_MODE:'file',AUTH_FILE_PATH:join(directory,'accounts.json'),DATABASE_URL:'',NODE_ENV:'development'}}});
