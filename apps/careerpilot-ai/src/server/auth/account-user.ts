import 'server-only';
import {cookies} from 'next/headers';
import {Pool} from 'pg';
import {sessionCookieName} from './cookies';
import {fileAuthEnabled,localAuth} from './local';
import {hashToken,validToken} from '@/lib/security';
type AccountUser={id:string;name:string|null;email:string|null;createdAt:Date};
const state=globalThis as unknown as {careerpilotAccountLookupPool?:Pool};
/** Read existing sessions without pulling generated ORM code into public pages. */
export async function resolveAccountUser(token:unknown):Promise<AccountUser|null>{if(!validToken(token))return null;if(fileAuthEnabled())return localAuth().currentUser(token);const connectionString=process.env.DATABASE_URL;if(!connectionString)throw Error('Account session storage is not configured.');const pool=state.careerpilotAccountLookupPool??=new Pool({connectionString,max:2,connectionTimeoutMillis:10000,allowExitOnIdle:true});const result=await pool.query<AccountUser>('SELECT u."id", u."name", u."email", u."createdAt" AT TIME ZONE \'UTC\' AS "createdAt" FROM "Session" s JOIN "User" u ON u."id"=s."userId" WHERE s."tokenHash"=$1 AND s."expiresAt">($2::timestamptz AT TIME ZONE \'UTC\') LIMIT 1',[hashToken(token),new Date().toISOString()]);return result.rows[0]||null;}
export async function currentAccountUser(){return resolveAccountUser((await cookies()).get(sessionCookieName())?.value);}
export function accountDestination(){return fileAuthEnabled()?'/local-workspace':'/dashboard';}
