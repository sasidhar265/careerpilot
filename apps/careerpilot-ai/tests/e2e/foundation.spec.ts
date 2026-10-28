import {test,expect} from '@playwright/test';
import {randomBytes,createHash} from 'node:crypto';
import {PrismaClient} from '../../src/generated/prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
const connectionString=process.env.E2E_DATABASE_URL;
let prisma:PrismaClient;
test.beforeAll(()=>{if(connectionString)prisma=new PrismaClient({adapter:new PrismaPg({connectionString})});});
test.afterAll(async()=>{if(prisma)await prisma.$disconnect();});
test('public landing has original branding and private pages require sign in',async({page,request})=>{await page.goto('/');await expect(page.getByText('CareerPilotAI',{exact:true}).first()).toBeVisible();await page.goto('/dashboard');await expect(page).toHaveURL(/\?auth=signin/);const response=await request.post('/api/resumes',{data:{title:'Unauthorized',text:'x'.repeat(100)}});expect(response.status()).toBe(401);});
test('owned profile saves persist and another user cannot modify/export private resources',async({page,request})=>{
 test.skip(!connectionString,'Set E2E_DATABASE_URL and apply migrations to the isolated test database.');
 const owner=await prisma.user.create({data:{name:'E2E owner'}}),other=await prisma.user.create({data:{name:'E2E other'}}),token=randomBytes(32).toString('base64url');
 let employerId:string|undefined,jobId:string|undefined;
 try{
 const privateResume=await prisma.resume.create({data:{userId:other.id,title:'Private',text:'Private resume '+ 'facts '.repeat(20)}});
 const employer=await prisma.employer.create({data:{name:'E2E employer',provider:'fixture',board:randomBytes(8).toString('hex'),careersUrl:'https://example.com'}});
 employerId=employer.id;
 const job=await prisma.job.create({data:{sourceKey:'e2e:'+randomBytes(8).toString('hex'),employerId:employer.id,title:'Automation Engineer',location:'London',description:'Synthetic E2E vacancy only',url:'https://example.com/job',source:'fixture'}});
 jobId=job.id;
 const otherApplication=await prisma.application.create({data:{userId:other.id,jobId:job.id}});
 await prisma.session.create({data:{userId:owner.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+600000)}});
 await page.context().addCookies([{name:'careerpilot_session',value:token,url:'http://localhost:3101',httpOnly:true,sameSite:'Lax'}]);
 await page.goto('/profile');await page.getByLabel('Professional headline').fill('Automation specialist');await page.getByRole('button',{name:'Save changes'}).click();await expect(page.getByRole('status')).toContainText('Profile saved');await page.reload();await expect(page.getByLabel('Professional headline')).toHaveValue('Automation specialist');
 const headers={Cookie:'careerpilot_session='+token,Origin:'http://localhost:3101'};
 expect((await request.get('/api/resumes/'+privateResume.id+'/export?format=pdf',{headers})).status()).toBe(404);
 expect((await request.patch('/api/applications/'+otherApplication.id,{headers,data:{notes:'Cross-owner change'}})).status()).toBe(404);
 expect((await request.post('/api/profile',{headers:{...headers,Origin:'https://foreign.example'},data:{headline:'X'}})).status()).toBe(403);
 // Theme persistence and the responsive navigation use actual browser state.
 await page.getByLabel('Appearance').selectOption('dark');
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.setViewportSize({width:390,height:844});
 await page.getByLabel('Open navigation').focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('navigation',{name:'Mobile navigation'})).not.toBeVisible();
 await expect(page.getByLabel('Open navigation')).toBeFocused();
 await page.keyboard.press('Enter');
 await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'My Resumes',exact:true}).click();
 await expect(page).toHaveURL(/\/resumes/);
 const draft='Taylor Example\ntaylor@example.com\nEXPERIENCE\nAutomation engineer with verified testing experience.\nSKILLS\nPlaywright, TypeScript\nEDUCATION\nComputer Science';
 await page.getByLabel('Resume text',{exact:true}).fill(draft);
 await expect(page.getByRole('region',{name:'Live document preview'})).toContainText('Automation engineer');
 await page.getByRole('button',{name:'Save master resume version',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Master resume version saved');
 await page.getByRole('button',{name:'Compare versions'}).click();
 await expect(page.getByLabel('Earlier version')).toBeVisible();
 await page.goto('/jobs?q='+encodeURIComponent(job.title));

 await page.getByText('Saved searches',{exact:false}).first().click();
 await page.getByLabel('Name this search').fill('Automation shortlist');
 await page.getByRole('button',{name:'Save current search',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Search saved.'})).toBeVisible();
 // Text entry submits after debounce, and restoring a saved search restores URL state.
 await page.getByLabel('Job title or keywords',{exact:true}).fill('NoSuchRole_'+token.slice(0,8));
 await expect(page).toHaveURL(/q=NoSuchRole_/);
 await expect(page.getByRole('status').filter({hasText:'0 matching opportunities'})).toBeVisible();
 await page.getByRole('link',{name:'Automation shortlist',exact:true}).click();
 await expect(page.getByLabel('Job title or keywords',{exact:true})).toHaveValue(job.title);
 await page.getByRole('button',{name:'Save Job',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'Saved',exact:true}).first()).toBeVisible();
 await page.getByText('Organise in a collection',{exact:true}).first().click();
 await page.getByLabel('Collection',{exact:true}).first().fill('Priority');
 await page.getByRole('button',{name:'Save collection',exact:true}).first().click();
 await expect(page.getByRole('status').filter({hasText:'Job preferences updated.'})).toBeVisible();
 await page.getByRole('button',{name:'Hide from discovery',exact:true}).first().click();
 await expect(page.getByRole('heading',{name:'Your next opportunity is still out there.'})).toBeVisible();
 await page.goto('/jobs?hidden=only&q='+encodeURIComponent(job.title));
 await page.getByRole('button',{name:'Unhide job',exact:true}).first().click();
 const foreignSearch=await prisma.savedSearch.create({data:{userId:other.id,name:'Private search',queryString:'q=Private'}});
 expect((await request.delete('/api/saved-searches/'+foreignSearch.id,{headers})).status()).toBe(404);

 // Page content must reflow; horizontal board scrolling stays inside its region.
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.goto('/applications');
 await page.getByRole('button',{name:'Table',exact:true}).click();
 await expect(page.getByRole('table')).toBeVisible();
 await page.getByLabel('Private application notes').fill('Follow up with the hiring team.');
 const ownResume=await prisma.resume.findFirstOrThrow({where:{userId:owner.id},orderBy:{createdAt:'desc'}});
 await page.getByLabel('Associated resume version').selectOption(ownResume.id);
 await page.getByLabel('Follow-up reminder',{exact:true}).fill('2026-11-01T09:30');
 await page.getByRole('button',{name:'Save application details'}).click();
 await expect(page.getByRole('status')).toContainText('Application details saved');
 await page.reload();await expect(page.getByLabel('Private application notes')).toHaveValue('Follow up with the hiring team.');
 await expect(page.getByLabel('Associated resume version')).toHaveValue(ownResume.id);
 const ownApplication=await prisma.application.findUniqueOrThrow({where:{userId_jobId:{userId:owner.id,jobId:job.id}}});
 expect((await request.patch('/api/applications/'+ownApplication.id,{headers,data:{resumeId:privateResume.id}})).status()).toBe(404);
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Add saved reminder to calendar'}).click();
 expect((await downloadPromise).suggestedFilename()).toBe('careerpilot-follow-up.ics');
 // Saving an already-applied job must not reset its application stage.
 await request.patch('/api/applications/'+ownApplication.id,{headers,data:{status:'APPLIED'}});
 await request.post('/api/applications',{headers,data:{jobId:job.id}});
 expect((await prisma.application.findUniqueOrThrow({where:{id:ownApplication.id}})).status).toBe('APPLIED');
 await page.goto('/saved');
 await page.getByRole('button',{name:'Remove from saved jobs'}).click();
 await expect(page.getByRole('heading',{name:'Make room for your next possibility.'})).toBeVisible();
 expect((await prisma.application.findUniqueOrThrow({where:{id:ownApplication.id}})).status).toBe('APPLIED');

 await page.setViewportSize({width:1024,height:768});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/settings');
 await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Settings',exact:true})).toHaveAttribute('aria-current','page');

 }finally{await prisma.user.deleteMany({where:{id:{in:[owner.id,other.id]}}});if(jobId)await prisma.job.deleteMany({where:{id:jobId}});if(employerId)await prisma.employer.deleteMany({where:{id:employerId}});}
});

test('resume upload preserves originals and requires review before active selection',async({page,request})=>{
 test.skip(!connectionString||!process.env.DOCUMENT_ENCRYPTION_KEYS,'Requires migrated isolated database and a test document keyring.');
 const user=await prisma.user.create({data:{name:'Baseline E2E'}}),other=await prisma.user.create({data:{name:'Other baseline E2E'}}),token=randomBytes(32).toString('base64url'),otherToken=randomBytes(32).toString('base64url');
 try{for(const [userId,value]of [[user.id,token],[other.id,otherToken]])await prisma.session.create({data:{userId,tokenHash:createHash('sha256').update(value).digest('hex'),expiresAt:new Date(Date.now()+600000)}});
 await page.context().addCookies([{name:'careerpilot_session',value:token,url:'http://localhost:3101',httpOnly:true,sameSite:'Lax'}]);
 const moduleName='docx';const {Document,Packer,Paragraph}=await import(moduleName);const bytes=await Packer.toBuffer(new Document({sections:[{children:['Taylor Example','taylor@example.org','Summary','Software engineer building reliable systems.','Skills','Playwright, TypeScript'].map(text=>new Paragraph(text))}]}));
 await page.goto('/profile');await page.getByLabel('Drop your resume here or choose a file').setInputFiles({name:'baseline.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:bytes});await expect(page.getByRole('heading',{name:'Review extracted profile'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Confirm and save master'})).toBeDisabled();
 for(const checkbox of await page.getByLabel(/^I confirm this/).all())await checkbox.check();await page.getByLabel('I reviewed the complete profile against the original, including missing information.').check();
 const warnings=page.getByLabel('I reviewed and resolved or accepted the extraction warnings.');if(await warnings.count())await warnings.check();
 await page.getByRole('button',{name:'Confirm and save master'}).click();await expect(page.getByRole('status')).toContainText('Confirmed master saved');await page.getByRole('button',{name:'Use this confirmed version as active'}).click();await expect(page.getByRole('status')).toContainText('Active baseline');
 const baseline=await prisma.resumeBaseline.findFirstOrThrow({where:{userId:user.id}});const headers={Cookie:'careerpilot_session='+token};const original=await request.get('/api/documents/'+baseline.documentId+'/original',{headers});expect(original.status()).toBe(200);expect(await original.body()).toEqual(bytes);
 expect((await request.get('/api/documents/'+baseline.documentId+'/original',{headers:{Cookie:'careerpilot_session='+otherToken}})).status()).toBe(404);
 await page.reload();await page.getByLabel('Open baseline').selectOption(baseline.id);await expect(page.getByRole('combobox',{name:'Version',exact:true})).toContainText('v1');
 }finally{const ids=[user.id,other.id];await prisma.candidateProfile.updateMany({where:{userId:{in:ids}},data:{activeBaselineId:null,activeVersionId:null}});await prisma.profileVersion.deleteMany({where:{userId:{in:ids}}});await prisma.resumeBaseline.deleteMany({where:{userId:{in:ids}}});await prisma.document.deleteMany({where:{userId:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:ids}}});}
});

test('manual tracker entries, interview preparation and drag/drop changes survive refresh',async({page})=>{
 test.skip(!connectionString,'Requires a migrated isolated test database.');const user=await prisma.user.create({data:{name:'Tracker browser fixture'}}),token=randomBytes(32).toString('base64url');try{await prisma.session.create({data:{userId:user.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+600000)}});await page.context().addCookies([{name:'careerpilot_session',value:token,url:'http://localhost:3101',httpOnly:true,sameSite:'Lax'}]);await page.goto('/applications');await page.getByText('Create application record',{exact:true}).click();await page.getByLabel('Employer',{exact:true}).fill('Tracker Example');await page.getByLabel('Role title',{exact:true}).fill('Test Engineer');await page.getByRole('button',{name:'Create application',exact:true}).click();await expect(page.getByRole('heading',{name:'Test Engineer',exact:true}).last()).toBeVisible();await page.getByLabel('Interview preparation notes').fill('Review automation examples');await page.getByRole('button',{name:'Save application details'}).click();await page.reload();await expect(page.getByLabel('Interview preparation notes')).toHaveValue('Review automation examples');const card=page.getByRole('button',{name:/Tracker Example Test Engineer/});const target=page.locator('.kanban-column').filter({has:page.getByRole('heading',{name:/^Applied ·/})});await card.dragTo(target);await expect.poll(async()=> (await prisma.application.findFirstOrThrow({where:{userId:user.id}})).status).toBe('APPLIED');await page.reload();await expect(page.getByLabel('Status',{exact:true})).toHaveValue('APPLIED');expect((await prisma.application.findFirstOrThrow({where:{userId:user.id}})).appliedAt).not.toBeNull();await page.goto('/dashboard');await expect(page.getByText('Applications submitted',{exact:true})).toBeVisible();}finally{await prisma.user.delete({where:{id:user.id}});}
});
