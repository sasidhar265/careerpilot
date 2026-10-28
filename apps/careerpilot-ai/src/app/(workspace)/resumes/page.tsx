import Link from 'next/link';
import {activeResume} from '@/server/profile/service';
import {requirePageUser} from '@/server/auth/session';
import {db} from '@/server/db/client';
import {PageHeading} from '@/components/page-heading';
import {ResumeEditor} from '@/components/resume-editor';
export default async function Resumes(){const user=await requirePageUser(),[versions,master]=await Promise.all([db().resume.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'},take:30}),activeResume(user.id)]);const history=master&&!versions.some(item=>item.id===master.id)?[master,...versions]:versions;return <><PageHeading eyebrow="Your experience, beautifully told" title="One story. Every opportunity." description="Build a clear master resume, tailor with evidence, and keep every version in your private workspace."/><p className="mb-4 text-sm"><Link className="font-semibold underline" href="/resumes/builder">Open the intelligent CV builder →</Link></p><p className="mb-6 text-sm"><Link className="font-semibold underline" href="/profile">Upload an original, review your profile, or select an active baseline</Link></p><ResumeEditor initialText={master?.text||''} versions={history.map(item=>({...item,createdAt:item.createdAt.toISOString()}))}/></>;}
