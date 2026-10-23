const money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0});
export function salaryLabel(min:number|null,max:number|null,estimated=false){let label=min===null&&max===null?'Salary unknown':min!==null&&max!==null?(min===max?money.format(min):money.format(min)+' – '+money.format(max))+' / year':min!==null?'From '+money.format(min)+' / year':'Up to '+money.format(max!)+' / year';if(estimated&&min!==null||estimated&&max!==null)label+=' · source estimate';return label;}

export function formatJobDate(value:string|Date,includeTime=false){const date=new Date(value);if(!Number.isFinite(date.getTime()))return 'Unknown';return includeTime?date.toLocaleString('en-GB',{timeZone:'Europe/London'}):date.toLocaleDateString('en-GB',{timeZone:'Europe/London'});}
