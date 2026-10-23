import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {allFacts,type StructuredProfile} from '../../src/lib/profile/model.ts';
const connection=process.env.INTEGRATION_DATABASE_URL||process.env.E2E_DATABASE_URL;
if(connection&&!new URL(connection).pathname.endsWith('_test'))throw Error('Profile integration tests require an isolated database ending in _test.');
test('private originals, ownership, reviewed versions, active selection and immutable history',{skip:!connection,timeout:120000},async()=>{
 process.env.DATABASE_URL=connection;const priorKeys=process.env.DOCUMENT_ENCRYPTION_KEYS,priorActive=process.env.DOCUMENT_ACTIVE_KEY_ID;process.env.DOCUMENT_ENCRYPTION_KEYS=JSON.stringify({test:randomBytes(32).toString('base64')});process.env.DOCUMENT_ACTIVE_KEY_ID='test';
 const {db}=await import('../../src/server/db/client.ts'),service=await import('../../src/server/profile/service.ts');
 // Actual DOCX generation: fixtures never enter production source lists.
 const fixtureModule='docx';const {Document,Packer,Paragraph}=await import(fixtureModule);
 const bytes=await Packer.toBuffer(new Document({sections:[{children:['Taylor Example','taylor@example.org','Summary','Software engineer building reliable automated systems.','Skills','TypeScript, Playwright'].map(text=>new Paragraph(text))}]}));
 const client=db(),owner=await client.user.create({data:{name:'Profile test owner'}}),other=await client.user.create({data:{name:'Other profile test owner'}});
 try{const upload=await service.uploadBaseline(owner.id,bytes,'baseline.docx');const baseline=await service.ownedBaseline(owner.id,upload.baselineId);assert.equal(baseline.revision,1);assert.deepEqual((await service.downloadOriginal(owner.id,upload.id)).bytes,bytes);await assert.rejects(service.downloadOriginal(other.id,upload.id));await assert.rejects(service.ownedBaseline(other.id,upload.baselineId));
 const draft=await service.getVersion(owner.id,upload.baselineId,upload.versionId),data=draft.data as unknown as StructuredProfile;
 await assert.rejects(service.saveVersion(owner.id,upload.baselineId,{expectedRevision:1,parentVersionId:draft.id,data,publish:true,reviewedSource:false,acknowledgeExtractionWarnings:true,makeActive:true}));
 for(const fact of allFacts(data))fact.confirmed=true;data.basics.fullName.value='Taylor Corrected';data.basics.fullName.evidence=null;
 const saved=await service.saveVersion(owner.id,upload.baselineId,{expectedRevision:1,parentVersionId:draft.id,data,publish:true,reviewedSource:true,acknowledgeExtractionWarnings:true,makeActive:false});assert.equal((await client.candidateProfile.findUnique({where:{userId:owner.id}}))?.activeBaselineId,undefined);
 await service.activateVersion(owner.id,upload.baselineId,saved.id);assert.equal((await service.activeResume(owner.id))?.id,saved.resumeId);
 await assert.rejects(service.saveVersion(owner.id,upload.baselineId,{expectedRevision:1,parentVersionId:draft.id,data,publish:false,reviewedSource:false,acknowledgeExtractionWarnings:false,makeActive:false}));
 await service.uploadBaseline(owner.id,bytes,'second.docx');assert.equal((await service.activeResume(owner.id))?.id,saved.resumeId);assert.equal((await service.versions(owner.id,upload.baselineId)).items.length,2);assert.equal((await service.getVersion(owner.id,upload.baselineId,draft.id)).status,'DRAFT');assert.deepEqual((await service.downloadOriginal(owner.id,upload.id)).bytes,bytes);
 await assert.rejects(client.document.update({where:{id:upload.id},data:{text:'overwrite'}}));await assert.rejects(client.profileVersion.update({where:{id:saved.id},data:{method:'overwrite'}}));
 }finally{const ids=[owner.id,other.id];await client.candidateProfile.updateMany({where:{userId:{in:ids}},data:{activeBaselineId:null,activeVersionId:null}});await client.profileVersion.deleteMany({where:{userId:{in:ids}}});await client.resumeBaseline.deleteMany({where:{userId:{in:ids}}});await client.document.deleteMany({where:{userId:{in:ids}}});await client.user.deleteMany({where:{id:{in:ids}}});if(priorKeys===undefined)delete process.env.DOCUMENT_ENCRYPTION_KEYS;else process.env.DOCUMENT_ENCRYPTION_KEYS=priorKeys;if(priorActive===undefined)delete process.env.DOCUMENT_ACTIVE_KEY_ID;else process.env.DOCUMENT_ACTIVE_KEY_ID=priorActive;await client.$disconnect();}
});
