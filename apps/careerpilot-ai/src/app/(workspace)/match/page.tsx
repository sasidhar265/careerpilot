import {resumeOptions} from '@/server/profile/service';
import {requirePageUser} from '@/server/auth/session';
import {PageHeading} from '@/components/page-heading';
import {Card} from '@/components/ui/card';
import {MatchWorkbench} from '@/components/match-workbench';
export default async function Match(){const user=await requirePageUser(),resumes=await resumeOptions(user.id,true);return <><PageHeading eyebrow="Match & tailor" title="Understand your evidence." description="Analyze a job description, review exact resume evidence and generate an ATS-friendly version grounded in your experience."/><Card><MatchWorkbench resumes={resumes}/></Card></>;}
