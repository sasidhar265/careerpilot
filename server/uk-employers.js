// Public career-board identifiers; live API health is recorded separately at refresh time.
export const UK_EMPLOYERS=[
 ['Monzo','greenhouse','monzo'],['Deliveroo','greenhouse','deliveroo'],['Spotify','lever','spotify'],['incident.io','ashby','incident'],
 ['GoCardless','greenhouse','gocardless'],['TrueLayer','greenhouse','truelayer'],['Cleo','greenhouse','cleoai'],['Canonical','greenhouse','canonical'],
 ['GitLab','greenhouse','gitlab'],['Grafana Labs','greenhouse','grafanalabs'],['Cloudflare','greenhouse','cloudflare'],['Datadog','greenhouse','datadog'],
 ['MongoDB','greenhouse','mongodb'],['Elastic','greenhouse','elastic'],['Snyk','greenhouse','snyk'],['Zopa','lever','zopa'],['Octopus Energy','lever','octoenergy'],
 ['Paddle','ashby','paddle'],['Version 1','smartrecruiters','Version1'],['Endava','smartrecruiters','Endava'],['Wise','smartrecruiters','Wise']
].map(([company,provider,board])=>({company,provider,board,region:'global',careersUrl:provider==='greenhouse'?`https://job-boards.greenhouse.io/${board}`:provider==='lever'?`https://jobs.lever.co/${board}`:provider==='ashby'?`https://jobs.ashbyhq.com/${board}`:`https://careers.smartrecruiters.com/${board}`}));
export const EXTERNAL_EMPLOYERS=[
 ['Accenture','https://www.accenture.com/gb-en/careers'],['Capgemini','https://www.capgemini.com/careers/'],['CGI','https://www.cgi.com/uk/en-gb/careers'],
 ['Cognizant','https://careers.cognizant.com/'],['Tata Consultancy Services','https://www.tcs.com/careers/united-kingdom'],['Infosys','https://www.infosys.com/careers/'],
 ['Wipro','https://careers.wipro.com/'],['HCLTech','https://www.hcltech.com/careers'],['IBM','https://www.ibm.com/careers'],['Microsoft','https://careers.microsoft.com/'],
 ['Google','https://www.google.com/about/careers/applications/'],['Amazon','https://www.amazon.jobs/'],['Oracle','https://www.oracle.com/careers/'],
 ['SAP','https://jobs.sap.com/'],['Salesforce','https://careers.salesforce.com/'],['Sage','https://www.sage.com/en-gb/company/careers/'],
 ['Sopra Steria','https://careers.soprasteria.co.uk/'],['BJSS','https://www.bjss.com/careers'],['Thoughtworks','https://www.thoughtworks.com/careers']
].map(([company,careersUrl])=>({company,careersUrl,provider:'external'}));
export function boardKey(board){return [board.provider,board.board,board.region||'global'].join(':');}
export function careerBoardUrl(board){return board.careersUrl|| (board.provider==='greenhouse'?`https://job-boards.greenhouse.io/${board.board}`:board.provider==='lever'?`https://jobs${board.region==='eu'?'.eu':''}.lever.co/${board.board}`:board.provider==='ashby'?`https://jobs.ashbyhq.com/${board.board}`:`https://careers.smartrecruiters.com/${board.board}`);}
export function parseCareerBoard(input,company){
 let url;try{url=new URL(input);}catch{throw Object.assign(Error('Enter a valid public careers board URL.'),{status:400});}
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw Object.assign(Error('Use an HTTPS public careers board URL.'),{status:400});
 const hosts={'job-boards.greenhouse.io':'greenhouse','boards.greenhouse.io':'greenhouse','jobs.lever.co':'lever','jobs.eu.lever.co':'lever','jobs.ashbyhq.com':'ashby','careers.smartrecruiters.com':'smartrecruiters','jobs.smartrecruiters.com':'smartrecruiters'};
 const provider=hosts[url.hostname],board=url.pathname.split('/').filter(Boolean)[0];
 if(!provider||!board||!/^[a-z0-9_-]{1,100}$/i.test(board))throw Object.assign(Error('Use a Greenhouse, Lever, Ashby or SmartRecruiters company board URL. Other careers sites can be visited directly.'),{status:400});
 if(typeof company!=='string'||!company.trim()||company.length>200)throw Object.assign(Error('Enter an employer name of 1–200 characters.'),{status:400});
 const item={provider,board,company:company.trim(),region:url.hostname==='jobs.eu.lever.co'?'eu':'global'};return {...item,careersUrl:careerBoardUrl(item)};
}
