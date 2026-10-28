import 'server-only';
import {db} from '@/server/db/client';
import {HttpError} from '@/server/http';
import {parseFilters,buildSearch,SearchValidationError} from '@/lib/jobs/query';
import {postcodePoint} from './geo';
export const filters={parse:parseFilters};
export async function searchJobs(input:unknown,userId?:string){try{const f=parseFilters(input),origin=f.radius?await postcodePoint(f.location):undefined,query=buildSearch(f,{userId,origin});return await db().$transaction(async tx=>{await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '6000ms'");const from='FROM "Job" j JOIN "Employer" e ON e.id=j."employerId" WHERE '+query.where;
 // Placeholder parameters are bound separately. Never interpolate user text into SQL.
 const count=await tx.$queryRawUnsafe<{total:bigint}[]>(`SELECT count(*) AS total FROM (SELECT ${query.score} AS relevance ${from}) counted`,...query.values);
 const ids=await tx.$queryRawUnsafe<{id:string;relevance:number;potentialDuplicateCount:bigint}[]>(`SELECT j.id,${query.score} AS relevance,(SELECT count(*) FROM "Job" candidate WHERE candidate."duplicateFingerprint"=j."duplicateFingerprint" AND candidate.id<>j.id AND candidate."duplicateOfId" IS NULL) AS "potentialDuplicateCount" ${from} ORDER BY ${query.order} LIMIT $${query.values.length+1} OFFSET $${query.values.length+2}`,...query.values,query.pageSize,(f.page-1)*query.pageSize);
 const records=await tx.job.findMany({where:{id:{in:ids.map(item=>item.id)}},include:{employer:true,observations:{select:{id:true,canonicalUrl:true,applicationUrl:true,lastVerifiedAt:true,missingSince:true,source:{select:{provider:true,board:true,status:true}}}},_count:{select:{duplicates:true}}}});const byId=new Map(records.map(job=>[job.id,job]));return {filters:f,total:Number(count[0].total),pageSize:query.pageSize,jobs:ids.map(item=>({...byId.get(item.id)!,relevance:item.relevance,potentialDuplicateCount:Number(item.potentialDuplicateCount)}))};},{isolationLevel:'RepeatableRead',timeout:15000});}catch(error){if(error instanceof SearchValidationError)throw new HttpError(400,error.message);throw error;}}
