export const HISTORY_KEY='align.resume-history.v1';
const kinds=['created','edited','final'];
function valid(entry){return entry&&typeof entry.id==='string'&&kinds.includes(entry.kind)&&typeof entry.savedAt==='string'&&Number.isFinite(Date.parse(entry.savedAt))&&typeof entry.text==='string'&&entry.text.length>=50&&entry.text.length<=45000&&typeof entry.original==='string'&&typeof entry.jobDescription==='string'&&entry.job&&typeof entry.job.title==='string'&&['keywords','responsibilities','requirements'].every(key=>Array.isArray(entry.job[key])&&entry.job[key].every(item=>typeof item==='string'));}
export function limitHistory(entries){
 const counts={edits:0,final:0};
 return entries.filter(valid).sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt)).filter(entry=>++counts[entry.kind==='final'?'final':'edits']<=10);
}
export function loadHistory(storage){try{const entries=JSON.parse(storage.getItem(HISTORY_KEY)||'[]');return Array.isArray(entries)?limitHistory(entries):[];}catch{return [];}}
export function addHistory(entries,entry){
 if(!valid(entry))return entries;
 const latest=entries.find(item=>item.kind===entry.kind);
 if(latest&&latest.text===entry.text&&latest.original===entry.original&&latest.jobDescription===entry.jobDescription&&JSON.stringify(latest.job)===JSON.stringify(entry.job))return entries;
 return limitHistory([entry,...entries]);
}
export function persistHistory(storage,entries){try{storage.setItem(HISTORY_KEY,JSON.stringify(entries));return true;}catch{return false;}}
