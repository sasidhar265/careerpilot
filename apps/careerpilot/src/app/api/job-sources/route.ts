import {route} from '@/server/http';
import {sourceStatus} from '@/server/jobs/status';
export async function GET(){return route(async()=>Response.json({sources:await sourceStatus()}));}
