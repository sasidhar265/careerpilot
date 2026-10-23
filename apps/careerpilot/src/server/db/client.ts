import 'server-only';
import {PrismaClient} from '@/generated/prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
const globalDb=globalThis as unknown as {careerpilotDb?:PrismaClient};
export function db(){if(globalDb.careerpilotDb)return globalDb.careerpilotDb;const connectionString=process.env.DATABASE_URL;if(!connectionString)throw new Error('DATABASE_URL is not configured.');const client=new PrismaClient({adapter:new PrismaPg({connectionString,max:10,connectionTimeoutMillis:10000})});globalDb.careerpilotDb=client;return client;}
