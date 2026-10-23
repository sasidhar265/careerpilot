import {z} from 'zod';
import {cleanResumeText,cleanSingleLine} from './profile-whitespace.mjs';
export const toolGroupSchema=z.object({heading:z.string().transform(cleanSingleLine).pipe(z.string().max(150)),body:z.string().transform(cleanResumeText).pipe(z.string().max(3000))}).strict();
export function toolBullets(text){return text.split(/[\r\n,;|•]+/).map(value=>cleanSingleLine(value.replace(/^\s*(?:[-*]\s+|\d+[.)]\s+)/,''))).filter(Boolean);}
export function parseToolGroups(text){const groups=[];let current=null;for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;const labelled=line.match(/^([^:]{1,150}):\s*(.*)$/);if(labelled&&!/^https?$/i.test(labelled[1])){current={heading:labelled[1],body:labelled[2]};groups.push(current);}else{if(!current){current={heading:'',body:''};groups.push(current);}current.body=[current.body,line].filter(Boolean).join('\n');}}return groups;}
export function toolGroupsText(groups){return groups.map(group=>[group.heading,...toolBullets(group.body).map(value=>`- ${value}`)].filter(Boolean).join('\n')).filter(Boolean).join('\n\n');}
