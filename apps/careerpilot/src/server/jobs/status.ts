import 'server-only';
import {db} from '@/server/db/client';
export async function sourceStatus(){return db().jobSource.findMany({where:{enabled:true},select:{id:true,key:true,provider:true,board:true,status:true,lastAttemptAt:true,lastSuccessAt:true,lastCompleteAt:true,lastErrorCode:true,collectionNote:true,nextRefreshAt:true,employer:{select:{name:true,careersUrl:true}}},orderBy:{key:'asc'},take:200});}
