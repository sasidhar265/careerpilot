import 'server-only';
import {fileAuthEnabled} from './local';
import {authCookieNames} from '@/lib/security';
import * as oidc from 'openid-client';
import {EncryptJWT,jwtDecrypt} from 'jose';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {authSecret,appUrl,oidcConfigured} from '@/server/config';
import {HttpError} from '@/server/http';
import {db} from '@/server/db/client';
const attemptSchema=z.object({state:z.string(),nonce:z.string(),verifier:z.string()});
export function attemptCookieName(){return authCookieNames(appUrl().href).attempt;}
function key(){return createHash('sha256').update(authSecret()).digest();}
async function client(){if(fileAuthEnabled())throw new HttpError(403,'Single sign-on is disabled in local mode.');if(!oidcConfigured())throw new HttpError(503,'Single sign-on is not configured.');const issuer=new URL(process.env.AUTH_ISSUER!);if(issuer.protocol!=='https:')throw new HttpError(503,'The identity issuer must use HTTPS.');return oidc.discovery(issuer,process.env.AUTH_CLIENT_ID!,process.env.AUTH_CLIENT_SECRET!);}
export async function beginLogin(){const config=await client(),verifier=oidc.randomPKCECodeVerifier(),state=oidc.randomState(),nonce=oidc.randomNonce();const challenge=await oidc.calculatePKCECodeChallenge(verifier);const redirectUri=new URL('/api/auth/callback',appUrl()).href;
 const url=oidc.buildAuthorizationUrl(config,{redirect_uri:redirectUri,scope:'openid profile email',code_challenge:challenge,code_challenge_method:'S256',state,nonce});
 const encrypted=await new EncryptJWT({verifier,state,nonce}).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuedAt().setIssuer('careerpilot').setAudience('oidc-attempt').setExpirationTime('10m').encrypt(key());return {url,encrypted};}
export async function finishLogin(callbackUrl:URL,encrypted:string){const {payload}=await jwtDecrypt(encrypted,key(),{issuer:'careerpilot',audience:'oidc-attempt'});const attempt=attemptSchema.parse(payload);const config=await client();const tokens=await oidc.authorizationCodeGrant(config,callbackUrl,{pkceCodeVerifier:attempt.verifier,expectedState:attempt.state,expectedNonce:attempt.nonce,idTokenExpected:true});const claims=tokens.claims();if(!claims?.sub)throw new HttpError(401,'Identity verification failed.');
 const issuer=process.env.AUTH_ISSUER!,subject=claims.sub;const identity=await db().identity.findUnique({where:{issuer_subject:{issuer,subject}}});if(identity)return identity.userId;
 // Never automatically link identities by email; unverified email is not persisted.
 const email=claims.email_verified===true&&typeof claims.email==='string'?claims.email.toLowerCase():null;
 const user=await db().user.create({data:{email,name:typeof claims.name==='string'?claims.name.slice(0,200):null,identities:{create:{issuer,subject}}}});return user.id;
}
