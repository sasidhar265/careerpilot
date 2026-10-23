import 'server-only';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionCookieName} from './cookies';
import {fileAuthEnabled,localAuth} from './local';
import {validToken} from '@/lib/security';
export async function currentLocalUser(){if(!fileAuthEnabled())return null;const token=(await cookies()).get(sessionCookieName())?.value;return validToken(token)?localAuth().currentUser(token):null;}
export async function requireLocalPageUser(){const user=await currentLocalUser();if(!user)redirect('/login');return user;}
export async function revokeLocalSession(){if(!fileAuthEnabled())return;const token=(await cookies()).get(sessionCookieName())?.value;if(validToken(token))await localAuth().revoke(token);}

export async function currentLocalProfile(){if(!fileAuthEnabled())return null;const token=(await cookies()).get(sessionCookieName())?.value;return validToken(token)?localAuth().profile(token):null;}
