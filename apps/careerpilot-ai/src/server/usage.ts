import 'server-only';
import {db} from '@/server/db/client';
import {HttpError} from '@/server/http';
export async function reserveDocumentUsage(userId:string){await db().$transaction(async tx=>{const bucket='documents:'+new Date().toISOString().slice(0,10),counter=await tx.usageCounter.upsert({where:{userId_bucket:{userId,bucket}},create:{userId,bucket,count:1},update:{count:{increment:1}}});if(counter.count>10)throw new HttpError(429,'Daily document extraction limit reached.');});}
