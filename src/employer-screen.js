// Fixed JD criteria and weights are shared across the original and tailored review.
export function employerCriteria(job){
 const criteria=[],seen=new Set();
 for(const [category,items,weight] of [['Qualification',job.requirements,3],['Responsibility',job.responsibilities,2],['Skill',job.keywords,1]]){
 for(const value of items){const requirement=value.trim(),key=requirement.toLowerCase();if(!requirement||seen.has(key))continue;seen.add(key);criteria.push({id:`criterion-${criteria.length}`,requirement,category,weight,explicitRequirement:/\b(must|required|minimum|essential|mandatory)\b/i.test(requirement)});}
 }
 return criteria;
}
export function summarizeScreen(criteria,assessments){
 const rows=criteria.map(criterion=>({...criterion,...assessments.find(a=>a.id===criterion.id)}));
 const total=criteria.reduce((sum,c)=>sum+c.weight,0);
 const earned=rows.reduce((sum,row)=>sum+row.weight*(row.status==='met'?1:row.status==='partial'?.5:0),0);
 return {score:total?Math.round(100*earned/total):null,rows,gaps:rows.filter(row=>row.status!=='met'),explicitGaps:rows.filter(row=>row.explicitRequirement&&row.status!=='met')};
}
export function currentScreen(record,resume,jobDescription){return record?.resume===resume&&record?.jobDescription===jobDescription?record.result:null;}
