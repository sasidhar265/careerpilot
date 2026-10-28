import {createHash,randomBytes} from 'node:crypto';
export function opaqueToken(){return randomBytes(32).toString('base64url');}
export function hashToken(token:string){return createHash('sha256').update(token).digest('hex');}
export function validToken(token:unknown):token is string{return typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token);}
export {safeHttpUrl} from './urls.ts';
export function authCookieNames(origin:string){const prefix=new URL(origin).protocol==='https:'?'__Host-':'';return {session:prefix+'careerpilot_session',attempt:prefix+'careerpilot_oidc'};}
