// Match literal JD phrases with word boundaries; preserve resume text verbatim.
export function highlightResumeText(text,keywords=[]){
 const terms=[...new Set(keywords.filter(term=>typeof term==='string'&&term.trim()).map(term=>term.trim()))].sort((a,b)=>b.length-a.length);
 if(!terms.length)return [{text,bold:false}];
 const escape=term=>term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])(?:${terms.map(escape).join('|')})(?![\\p{L}\\p{N}_])`,'giu');
 const runs=[];let offset=0;
 for(const match of text.matchAll(pattern)){if(match.index>offset)runs.push({text:text.slice(offset,match.index),bold:false});runs.push({text:match[0],bold:true});offset=match.index+match[0].length;}
 if(offset<text.length)runs.push({text:text.slice(offset),bold:false});
 return runs;
}
export const highlightableBlock=type=>['paragraph','bullet','skills'].includes(type);
