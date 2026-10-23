import {requirePageUser} from '@/server/auth/session';
import {redirect} from 'next/navigation';
import {fileAuthEnabled} from '@/server/auth/local';
import {AppShell} from '@/components/app-shell';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export default async function Workspace({children}:{children:React.ReactNode}){const user=await requirePageUser();if(fileAuthEnabled())redirect('/local-account');return <AppShell name={user.name||user.email||'Your account'} email={user.email}>{children}</AppShell>;}
