export function availableCopilotModels(data){
 const list=Array.isArray(data)?data:data?.models;
 if(!Array.isArray(list))return null;
 const seen=new Set();
 return list.filter(model=>model&&typeof model.id==='string'&&/^[a-z0-9][a-z0-9._:/-]{0,199}$/i.test(model.id)&&model.policy?.state!=='disabled'&&!seen.has(model.id)&&(seen.add(model.id),true)).map(model=>({
 id:model.id,name:typeof model.name==='string'&&model.name.trim()?model.name:model.id,
 ...(typeof model.billing?.multiplier==='number'&&Number.isFinite(model.billing.multiplier)?{multiplier:model.billing.multiplier}:{}),
 }));
}
export function selectedCopilotModel(models,id){return models?.find(model=>model.id===id)||null;}
