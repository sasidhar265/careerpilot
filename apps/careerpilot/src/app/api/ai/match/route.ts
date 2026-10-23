import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {analysisInput} from '@/server/validation';
import {z} from 'zod';
import {extractJob,scoreJob,tailorAnalysis} from '@/server/matching/service';
export const runtime='nodejs';
export const maxDuration=300;
// Compatibility endpoint: the initial call extracts a persisted checklist, never silently scores an unreviewed JD.
const inputSchema=analysisInput.extend({jdVersionId:z.string().min(1).max(200).optional(),requirementsReviewed:z.boolean().optional()});
export async function POST(request:Request){return route(async()=>{const user=await requireUser(),input=await validatedJson(request,inputSchema);if(!input.jdVersionId||!input.requirementsReviewed){const jdVersion=await extractJob(user.id,{jobDescription:input.jobDescription});return Response.json({jdVersion,requiresReview:true,message:'Review the extracted checklist before calculating a match.'},{status:202});}const analysis=await scoreJob(user.id,{resumeId:input.resumeId,jdVersionId:input.jdVersionId,requirementsReviewed:true});return Response.json({analysis,...(input.operation==='tailor'?await tailorAnalysis(user.id,analysis.id):{})});});}
