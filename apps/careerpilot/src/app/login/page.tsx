import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
/** Keep existing login links and OIDC callback errors working with the landing dialog. */
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){const params=await searchParams;const query=new URLSearchParams({auth:'signin'});if(params.error)query.set('error',params.error);redirect('/?'+query.toString());}
