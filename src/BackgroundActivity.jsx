import React from 'react';
import {LoaderCircle} from 'lucide-react';
export function activitySummary(status,checkingProviders){
 if(!status&&checkingProviders)return {title:'Checking AI access',detail:'Checking account access, available models, and reported usage limits.'};
 if(/download|export/i.test(status))return {title:'Preparing your download',detail:'Formatting the saved resume, highlighting JD matches, and creating your file.'};
 if(/employer/i.test(status))return {title:'Reviewing employer fit',detail:'Checking job requirements against resume evidence and identifying gaps to review.'};
 if(/refining/i.test(status))return {title:'Improving JD alignment',detail:'Making one additional revision toward the 80% ATS estimate target using your original experience.'};
 if(/tailored|building/i.test(status))return {title:'Applying accepted changes',detail:'Rewriting the resume around the job description, with compact skills and supported experience.'};
 if(/comparing/i.test(status))return {title:'Comparing your resume',detail:'Checking relevant experience, qualifications, and terminology to propose supported changes.'};
 if(/job description/i.test(status))return {title:'Analyzing the job',detail:'Extracting key skills, responsibilities, and qualifications from the job description.'};
 return {title:'Reading your document',detail:'Preparing source text for analysis. Scanned documents may need text recognition.'};
}
export function BackgroundActivity({busy,checkingProviders,status,provider}){
 if(!busy&&!checkingProviders)return null;
 const activity=activitySummary(busy?status:'',checkingProviders);
 return <aside className="background-popup" role="status" aria-live="polite" aria-atomic="true"><LoaderCircle className="activity-spinner" size={24}/><div><strong>{activity.title}</strong><p>{activity.detail}</p>{status&&busy&&<small>{status}</small>}{provider&&busy&&!/download|export/i.test(status)&&<small>AI: {provider}</small>}</div></aside>;
}
