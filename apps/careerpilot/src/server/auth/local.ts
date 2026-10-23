import 'server-only';
import {resolve} from 'node:path';
import {createFileAuth,fileAuthEnabled} from '@/lib/file-auth.mjs';
export {fileAuthEnabled};
export function localAuth(){if(!fileAuthEnabled())throw Error('Local authentication is disabled.');return createFileAuth(resolve(/*turbopackIgnore: true*/ process.env.AUTH_FILE_PATH||'.local/auth/accounts.json'));}
