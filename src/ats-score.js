import {contains} from './analysis.js';
import {parseResume} from './resume-format.js';

// A repeatable text-based estimate, using the same rubric before and after edits.
export function scoreResume(text,job){
 const blocks=parseResume(text),headings=blocks.filter(b=>b.type==='heading').map(b=>b.text);
 const keywords=[...new Set((job?.keywords||[]).map(k=>k.trim().toLowerCase()).filter(Boolean))];
 const matched=keywords.filter(k=>contains(text,k));
 const experience=[];let inExperience=false;
 for(const block of blocks){if(block.type==='heading')inExperience=/^(PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|EMPLOYMENT HISTORY)$/.test(block.text);else if(inExperience)experience.push(block);}
 const checks=[
 {label:'Name at the top',passed:!!blocks[0]&&blocks[0].type==='name'&&blocks[0].text.length<=100&&!/@/.test(blocks[0].text)},
 {label:'Email or phone contact',passed:/[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d ()-]{7,}\d/i.test(text)},
 {label:'Standard experience heading',passed:headings.some(h=>/^(PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|EMPLOYMENT HISTORY)$/.test(h))},
 {label:'Standard skills heading',passed:headings.some(h=>/SKILLS|COMPETENCIES|TECHNICAL (DETAILS|PROFICIENCIES|EXPERTISE)/.test(h))},
 {label:'Experience described with bullets',passed:experience.some(b=>b.type==='bullet')},
 {label:'Employment dates present',passed:experience.some(b=>/\b(?:19|20)\d{2}\b/.test(b.text))},
 ];
 const structure=Math.round(checks.filter(c=>c.passed).length/checks.length*100);
 const coverage=keywords.length?Math.round(matched.length/keywords.length*100):null;
 const score=coverage===null?null:Math.round(70*matched.length/keywords.length+30*checks.filter(c=>c.passed).length/checks.length);
 return {score,coverage,structure,checks,matched,missing:keywords.filter(k=>!matched.includes(k)),keywordCount:keywords.length};
}
