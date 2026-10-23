import Link from 'next/link';
import {MapPin,ArrowUpRight} from 'lucide-react';
import {Card} from './ui/card';
import {Badge} from './ui/badge';
import {safeHttpUrl} from '@/lib/urls';
import {freshness} from '@/lib/jobs/freshness';
import {salaryLabel,formatJobDate} from '@/lib/jobs/presentation';
import {SaveJob} from './save-job';
type JobCardData={id:string;title:string;location:string;source:string;salaryMin:number|null;salaryMax:number|null;salaryEstimated:boolean;lastSeenAt:Date;employer:{name:string};url:string;lastVerifiedAt?:Date|null;potentiallyExpiredAt?:Date|null;closingAt?:Date|null};
export function JobCard({job,saved=false}:{job:JobCardData;saved?:boolean}){return <Card><div className="flex items-start gap-3"><span className="company-monogram" aria-hidden="true">{job.employer.name.slice(0,2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{job.employer.name}</p><h2 className="mt-1"><Link href={'/jobs/'+job.id}>{job.title}</Link></h2></div><Badge>{job.source}</Badge></div><p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><MapPin size={14} aria-hidden="true"/>{job.location||'Location not supplied'}</p><p className="mt-3 text-sm font-medium">{salaryLabel(job.salaryMin,job.salaryMax,job.salaryEstimated)}</p><p className="muted mt-2">{freshness(job).label}</p><p className="mt-3 text-xs text-muted-foreground">Seen in source {formatJobDate(job.lastSeenAt)}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><SaveJob jobId={job.id} initialSaved={saved}/><Link href={'/jobs/'+job.id} className="text-xs text-primary">Resume Match →</Link>{safeHttpUrl(job.url)&&<a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground underline">Employer advert <ArrowUpRight size={13} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>}</div></Card>;}
