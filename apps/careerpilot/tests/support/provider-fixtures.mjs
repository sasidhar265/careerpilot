// Explicit test-process boundaries only. Never imported by application/runtime code.
import {generateKeyPairSync,createSign,createHash} from 'node:crypto';
const issuer='https://identity.careerpilot.test';
const encode=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
export function createFixtureFetch(original,env){
 const app=new URL(env.APP_URL||'http://invalid'),database=new URL(env.DATABASE_URL||'http://invalid');
 if(env.CAREERPILOT_E2E_PROVIDER_FIXTURES!=='1'||env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(app.hostname)||!database.pathname.endsWith('_test'))throw Error('Provider fixtures require explicit opt-in, a loopback app and an isolated *_test database.');
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...publicKey.export({format:'jwk'}),kid:'careerpilot-test-key',use:'sig',alg:'RS256'},usedCodes=new Set();
 return async(input,init={})=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(url.origin===issuer){
   if(url.pathname.includes('.well-known'))return Response.json({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],token_endpoint_auth_methods_supported:['client_secret_post'],code_challenge_methods_supported:['S256']});
   if(url.pathname==='/jwks')return Response.json({keys:[jwk]});
   if(url.pathname==='/token'){const fields=new URLSearchParams(init.body!==undefined?String(init.body):input instanceof Request?await input.clone().text():'');let code;try{code=JSON.parse(Buffer.from(fields.get('code')||'','base64url').toString());}catch{return Response.json({error:'invalid_grant'},{status:400});}const challenge=createHash('sha256').update(fields.get('code_verifier')||'').digest('base64url');if(challenge!==code.challenge||fields.get('client_id')!=='careerpilot-e2e-client'||fields.get('client_secret')!=='e2e-only-placeholder')return Response.json({error:'invalid_grant'},{status:400});if(usedCodes.has(fields.get('code')))return Response.json({error:'invalid_grant'},{status:400});usedCodes.add(fields.get('code'));const now=Math.floor(Date.now()/1000),header=encode({alg:'RS256',kid:jwk.kid}),payload=encode({iss:issuer,aud:'careerpilot-e2e-client',sub:'e2e-primary-journey',nonce:code.nonce,iat:now,exp:now+300,name:'Journey Fixture Candidate',email:'journey@careerpilot.test',email_verified:true}),signing=header+'.'+payload,signer=createSign('RSA-SHA256');signer.update(signing);signer.end();return Response.json({access_token:'e2e-only-access-placeholder',token_type:'Bearer',expires_in:300,id_token:signing+'.'+signer.sign(privateKey).toString('base64url')});}
   throw Error('Unexpected isolated OIDC fixture endpoint.');
  }
  if(url.origin==='https://api.openai.com'){
   if(url.pathname!=='/v1/responses')throw Error('Unexpected isolated AI fixture endpoint.');const body=JSON.parse(init.body!==undefined?String(init.body):input instanceof Request?await input.clone().text():'{}'),source=JSON.parse(body.input||'{}'),action=body.text?.format?.name;let value;
   if(String(source.jobDescription||'').includes('[PROVIDER_FAILURE_FIXTURE]'))return Response.json({error:{message:'Explicit provider failure fixture'}},{status:503});
   if(action==='requirements'){const jd=source.jobDescription;if(typeof jd!=='string'||!jd.includes('TypeScript is required.')||!jd.includes('AWS is preferred.'))throw Error('Primary journey JD fixture does not match.');value={title:jd.split('\n')[0],titleQuote:jd.split('\n')[0],requirements:[{category:'technical',priority:'mandatory',criterion:'TypeScript',quote:'TypeScript is required.'},{category:'technical',priority:'preferred',criterion:'AWS',quote:'AWS is preferred.'}],warnings:['Explicit isolated AI fixture; not a live-provider validation.']};if(jd.includes('[MALFORMED_AI_FIXTURE]'))value.requirements[0].criterion='Invented qualification';}
   else if(action==='buildResume'){const blocks=source.source?.blocks||[],bullet=blocks.find(b=>b.kind==='bullet'&&b.scope==='employment'),skills=blocks.filter(b=>b.kind==='entry'&&b.scope==='skills');if(!bullet)throw Error('Primary journey requires a genuine extracted employment bullet.');value={proposals:[{id:'fixture-bullet',kind:'bullet',targetId:bullet.id,text:bullet.text.replace(/^(?:I was responsible for |Responsible for )/i,''),factIds:bullet.factIds,order:[],reason:'Explicit AI fixture: remove a redundant lead-in without changing facts.'}],questions:['Explicit fixture question: can you provide evidence of AWS usage?']};if(skills.length)value.proposals.push({id:'fixture-skills',kind:'skillsOrder',targetId:skills[0].sectionId,text:'',factIds:[],order:skills.map(s=>s.entryId).reverse(),reason:'Explicit AI fixture: reorder only existing skills.'});}
   else throw Error('Unexpected isolated AI fixture action.');
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
  }
  return original(input,init);
 };
}
if(process.env.CAREERPILOT_E2E_PROVIDER_FIXTURES==='1')globalThis.fetch=createFixtureFetch(globalThis.fetch,process.env);
