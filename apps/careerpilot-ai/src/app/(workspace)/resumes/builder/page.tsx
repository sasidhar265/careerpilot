import {requirePageUser} from '@/server/auth/session';
import {resumeOptions} from '@/server/profile/service';
import {PageHeading} from '@/components/page-heading';
import {ResumeBuilder} from '@/components/resume-builder';
export default async function Builder({searchParams}:{searchParams:Promise<{analysis?:string}>}){const user=await requirePageUser(),params=await searchParams;return <><PageHeading eyebrow="Evidence-led UK CV builder" title="Your experience. Clearly expressed." description="Review AI suggestions, preserve the facts, and export a searchable PDF or editable DOCX."/><ResumeBuilder resumes={await resumeOptions(user.id,true)} initialAnalysisId={typeof params.analysis==='string'?params.analysis.slice(0,200):''}/></>;}
