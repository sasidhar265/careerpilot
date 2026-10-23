export function searchTokens(value){
 return (value||'').normalize('NFKC').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().match(/[\p{L}\p{N}+#]+/gu)||[];
}
function root(word){
 if(/^(test|tests|testing|tester|testers)$/.test(word))return 'test';
 if(/^(automation|automations|automated|automate|automates|automating)$/.test(word))return 'automat';
 return word;
}
export function keywordMatch(job,query){
 const terms=[...new Set(searchTokens(query).map(root))];if(!terms.length)return {matches:true,score:0};
 const title=searchTokens(job.title).map(root),body=searchTokens([job.company,job.description].filter(Boolean).join(' ')).map(root);
 const all=new Set([...title,...body]);const matches=terms.every(term=>all.has(term));
 const phrase=searchTokens(query).join(' '),titleText=searchTokens(job.title).join(' ');
 return {matches,score:terms.filter(term=>title.includes(term)).length*10+(phrase&&titleText.includes(phrase)?20:0)};
}
