/** Build an external LinkedIn search. No account credentials or cookies are used. */
export function linkedInSearchUrl(filters={}){
 const url=new URL('https://www.linkedin.com/jobs/search/');
 const keywords=String(filters.q??filters.what??'').trim();
 const location=String(filters.location??filters.where??'').trim()||'United Kingdom';
 if(keywords)url.searchParams.set('keywords',keywords);
 url.searchParams.set('location',location);
 const days=Number(filters.days);
 if(Number.isInteger(days)&&days>0&&days<=365)url.searchParams.set('f_TPR','r'+days*86400);
 const types={full_time:'F',part_time:'P',contract:'C',temporary:'T',internship:'I'};
 const employment=filters.employment||filters.contract;
 if(types[employment])url.searchParams.set('f_JT',types[employment]);
 const workplace={Remote:'2',Hybrid:'3',OnSite:'1'};
 if(workplace[filters.workplace])url.searchParams.set('f_WT',workplace[filters.workplace]);
 if(['date','newest'].includes(filters.sort))url.searchParams.set('sortBy','DD');
 else if(filters.sort==='relevance')url.searchParams.set('sortBy','R');
 return url.href;
}
