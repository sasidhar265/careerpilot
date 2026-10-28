import 'server-only';
import {db} from './db/client';
import {HttpError} from './http';
import {saveLegacyProfile} from './profile/service';
import {profileInput,resumeInput} from './validation';
import type {z} from 'zod';
export async function saveProfile(userId:string,input:z.infer<typeof profileInput>){return saveLegacyProfile(userId,input);}
export async function saveResume(userId:string,input:z.infer<typeof resumeInput>){return db().resume.create({data:{userId,...input,kind:'MASTER'}});}
export async function ownedResume(userId:string,id:string){const resume=await db().resume.findFirst({where:{id,userId}});if(!resume)throw new HttpError(404,'Resume not found.');return resume;}
export {saveApplication,updateApplication} from './tracker/service';
