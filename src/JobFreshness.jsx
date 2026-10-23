import React from 'react';
export function JobFreshness({job}){
 if(!job?.lastSeenAt)return <small className="job-freshness">Availability not checked. Verify the original advert.</small>;
 const date=new Date(job.lastSeenAt),label=job.availability==='expired'?'Past source closing date':job.availability==='stale'?'Not seen in over 7 days':'Recently seen in source';
 return <small className={`job-freshness ${job.availability||''}`}>{label}{!isNaN(+date)?` · Last seen ${date.toLocaleString('en-GB')}`:''}{job.closingDate?` · Closes ${new Date(job.closingDate).toLocaleDateString('en-GB')}`:''}</small>;
}
