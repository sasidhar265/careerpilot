import 'server-only';
import {applicationOrigin} from '@/lib/urls';
export function appUrl(){return applicationOrigin(process.env.APP_URL||'http://localhost:3100',process.env.NODE_ENV==='production');}
export function oidcConfigured(){return Boolean(process.env.AUTH_ISSUER&&process.env.AUTH_CLIENT_ID&&process.env.AUTH_CLIENT_SECRET&&process.env.AUTH_SECRET&&process.env.AUTH_SECRET.length>=32);}
export function authSecret(){const value=process.env.AUTH_SECRET;if(!value||value.length<32)throw new Error('Set AUTH_SECRET to at least 32 random characters.');return value;}
