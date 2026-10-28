import {z} from 'zod';
export const profileInput=z.object({headline:z.string().trim().max(160),location:z.string().trim().max(160),summary:z.string().trim().max(5000),skills:z.array(z.string().trim().min(1).max(80)).max(100),targetRoles:z.array(z.string().trim().min(1).max(120)).max(20),workPreference:z.enum(['','remote','hybrid','onsite'])}).strict();
export const resumeInput=z.object({title:z.string().trim().min(1).max(160),text:z.string().trim().min(50).max(45000)}).strict();
export {applicationInput,applicationUpdate} from './tracker/validation';
export const assistantInput=z.object({message:z.string().trim().min(3).max(3000),conversationId:z.string().max(200).optional()}).strict();
export const analysisInput=z.object({jobDescription:z.string().trim().min(50).max(45000),resumeId:z.string().min(1).max(200),operation:z.enum(['match','tailor']).default('match')}).strict();
