export const resumeHeadings=new Set(['PROFESSIONAL SUMMARY','SUMMARY','PROFILE','CORE SKILLS','KEY SKILLS','SKILLS','TECHNICAL SKILLS','OTHER TECHNICAL SKILLS','OTHER SKILLS','TECHNICAL DETAILS','TECHNICAL PROFICIENCIES','TECHNICAL EXPERTISE','CORE COMPETENCIES','PROFESSIONAL EXPERIENCE','WORK EXPERIENCE','EXPERIENCE','EMPLOYMENT HISTORY','EDUCATION','CERTIFICATIONS','PROJECTS','PROFESSIONAL DEVELOPMENT','AWARDS','VOLUNTEER EXPERIENCE','LANGUAGES','ADDITIONAL INFORMATION','PUBLICATIONS']);
export function resumeToText(resume){
 const sections=[];const header=[resume.name.trim(),resume.contact.filter(Boolean).join(' | ')].filter(Boolean);if(header.length)sections.push(header.join('\n'));
 if(resume.summary.trim())sections.push('PROFESSIONAL SUMMARY\n'+resume.summary.trim());
 if(resume.skills.length)sections.push('CORE SKILLS\n'+resume.skills.map(skill=>'• '+skill).join('  '));
 if(resume.experience.length)sections.push('PROFESSIONAL EXPERIENCE\n'+resume.experience.map(e=>[e.title,[e.organization,e.location,e.dates].filter(Boolean).join(' | '),...e.bullets.map(b=>'- '+b)].filter(Boolean).join('\n')).join('\n\n'));
 if(resume.education.length)sections.push('EDUCATION\n'+resume.education.map(e=>[e.qualification,[e.institution,e.dates].filter(Boolean).join(' | '),...e.details.map(b=>'- '+b)].filter(Boolean).join('\n')).join('\n\n'));
 for(const section of resume.additionalSections)if(section.items.length)sections.push(section.heading.toUpperCase()+'\n'+section.items.map(item=>'- '+item).join('\n'));
 return sections.join('\n\n');
}
export function parseResume(text){
 const lines=text.replace(/\r\n/g,'\n').split('\n').map(l=>l.trim());const blocks=[];let section='',header=true;
 for(let i=0;i<lines.length;i++){
 const line=lines[i];if(!line)continue;
 const normalized=line.replace(/^#{1,6}\s*/,'').replace(/\*\*/g,'').replace(/:$/,'').toUpperCase();
 if(resumeHeadings.has(normalized)||(normalized===line&&line.length<55&&/^[A-Z][A-Z &/]+$/.test(line)&&blocks.length>1)){
 section=normalized;header=false;blocks.push({type:'heading',text:normalized});continue;
 }
 if(header){blocks.push({type:blocks.length===0?'name':'contact',text:line});continue;}
 if(/SKILLS|COMPETENCIES|TECHNICAL (?:DETAILS|PROFICIENCIES|EXPERTISE)/.test(section)){
 const content=line.replace(/^[-•*]\s+/, '');
 // Keep category descriptions and commas within parentheses intact.
 const separator=/[|•;]/.test(content)?/[|•;]/:content.includes(':')?null:/,(?![^()]*\))/;
 const items=(separator?content.split(separator):[content]).map(item=>item.trim()).filter(Boolean);
 const previous=blocks.at(-1);
 if(previous?.type==='skills'){previous.items.push(...items);previous.text=previous.items.map(item=>'• '+item).join('  ');}
 else if(items.length)blocks.push({type:'skills',items,text:items.map(item=>'• '+item).join('  ')});
 continue;
 }
 if(/^[-•*]\s+/.test(line)){blocks.push({type:'bullet',text:line.replace(/^[-•*]\s+/,'')});continue;}
 const inEntries=/EXPERIENCE|EMPLOYMENT|EDUCATION/.test(section);const next=lines[i+1]?.trim();
 if(inEntries&&next&&!/^[-•*]\s/.test(next)&&!resumeHeadings.has(next.toUpperCase())&&(next.includes('|')||/\b(?:19|20)\d{2}\b|present/i.test(next))){blocks.push({type:'entry',text:line},{type:'metadata',text:next});i++;continue;}
 blocks.push({type:'paragraph',text:line});
 }
 return blocks;
}
