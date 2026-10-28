import {cleanSingleLine} from '@/lib/profile-whitespace.mjs';
import {redirect} from 'next/navigation';
import {AppShell} from '@/components/app-shell';
import {LocalProfileEditor} from '@/components/local-profile-editor';
import {requireLocalPageUser,currentLocalProfile} from '@/server/auth/local-session';
import {fileAuthEnabled} from '@/server/auth/local';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export default async function LocalAccount(){if(!fileAuthEnabled())redirect('/dashboard');const user=await requireLocalPageUser(),details=await currentLocalProfile(),name=cleanSingleLine(user.name||user.email||'Your account');return <AppShell name={name} email={user.email} local><h1 className="sr-only">Your account</h1><div className="w-full min-w-0"><LocalProfileEditor profile={{name:user.name,email:user.email,resumeProfile:details?.resumeProfile}}/></div></AppShell>;}
