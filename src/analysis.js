const skills = ['JavaScript','TypeScript','Python','Java','C++','C#','React','Angular','Vue','Node.js','SQL','PostgreSQL','MySQL','MongoDB','AWS','Azure','GCP','Docker','Kubernetes','Git','CI/CD','HTML','CSS','REST','GraphQL','Agile','Scrum','Figma','Excel','Power BI','Tableau','Salesforce','SAP','Machine learning','Data analysis','Project management','Product management','Stakeholder management','Communication','Leadership','Teamwork','Problem solving','Customer service','Digital marketing','SEO','Accounting','Financial analysis','Recruitment','UX','UI','Testing','Automation','Linux','Security','Research','Budgeting'];
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const contains = (text, term) => new RegExp(`(^|[^a-z0-9])${escape(term)}(?=$|[^a-z0-9])`, 'i').test(text);
export function analyzeJob(text) {
 const lines = text.split(/\n|(?<=[.!?])\s+/).map(l=>l.replace(/^[-•*\s]+/,'').trim()).filter(l=>l.length>12);
 const keywords = skills.filter(skill=>contains(text,skill));
 const stop = new Set('about after also and are as at be been being by can company for from have in into is it job join looking of on or our role that the their this to we will with work you your years experience required responsibilities skills team ability strong must candidate using including'.split(' '));
 const words = text.toLowerCase().match(/[a-z][a-z-]{3,}/g)||[];
 const counts = {}; for(const w of words) if(!stop.has(w)&&!keywords.some(k=>k.toLowerCase().includes(w))) counts[w]=(counts[w]||0)+1;
 const extras=Object.entries(counts).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([w])=>w);
 return {keywords:[...keywords,...extras], responsibilities:lines.filter(l=>/develop|build|manage|lead|design|support|deliver|collaborat|responsib|implement|maintain|create|analy/i.test(l)).slice(0,5),requirements:lines.filter(l=>/require|experience|proficien|degree|knowledge|years|skill|must|qualific/i.test(l)).slice(0,5),title:text.split('\n').find(l=>l.trim())?.slice(0,100)||'Job description'};
}
export function compareResume(job,resume) {
 const matched=job.keywords.filter(k=>contains(resume,k)),missing=job.keywords.filter(k=>!contains(resume,k));
 const suggestions=[];
 if(matched.length) suggestions.push({id:'skills',title:'Bring relevant skills into focus',detail:'Add a targeted skills section using keywords already present in your resume.',addition:'RELEVANT SKILLS\n'+matched.join(' • '),applicable:true});
 if(missing.length) suggestions.push({id:'missing',title:'Review the missing keywords',detail:`The resume does not mention ${missing.join(', ')}. Add them with supporting experience only if they are accurate.`,applicable:false});
 if(!/\d+\s*(%|percent|users|clients|projects|million|hours)/i.test(resume)) suggestions.push({id:'impact',title:'Make your impact measurable',detail:'Where you have evidence, add results such as time saved, revenue, customers served, or project scale. These details need your input.',applicable:false});
 if(!/summary|profile/i.test(resume)) suggestions.push({id:'summary',title:'Add a focused opening summary',detail:'Write two or three sentences connecting your existing experience to the reviewed requirements. Avoid claiming qualifications you do not have.',applicable:false});
 return {matched,missing,score:job.keywords.length?Math.round(matched.length/job.keywords.length*100):0,suggestions};
}
export function updateResume(resume,suggestions,selected) {const additions=suggestions.filter(s=>s.applicable&&selected.includes(s.id)).map(s=>s.addition);return [resume.trim(),...additions].join('\n\n');}
