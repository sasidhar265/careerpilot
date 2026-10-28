import {requirePageUser} from '@/server/auth/session';
import {db} from '@/server/db/client';
import {listApplications} from '@/server/tracker/service';
import {PageHeading} from '@/components/page-heading';
import {ApplicationTracker} from '@/components/application-tracker';
export default async function Applications({searchParams}:{searchParams:Promise<{resumeId?:string;applicationId?:string}>}){const user=await requirePageUser(),[result,resumes]=await Promise.all([listApplications(user.id,new URL('http://internal/applications')),db().resume.findMany({where:{userId:user.id},select:{id:true,title:true},orderBy:{createdAt:'desc'}})]);const params=await searchParams;return <><PageHeading eyebrow="Your application pipeline" title="Keep every next step in view." description="Track genuine activity, prepare for interviews and plan follow-ups. Employer links never mark applications as submitted."/><ApplicationTracker initial={JSON.parse(JSON.stringify(result))} resumes={resumes} initialResumeId={resumes.some(r=>r.id===params.resumeId)?params.resumeId:undefined} initialApplicationId={params.applicationId}/></>;}
