import React from 'react';
import {highlightResumeText,highlightableBlock} from './resume-highlights.js';
import {parseResume} from './resume-format.js';
export function ResumePreview({text,keywords=[]}){
 const blocks=parseResume(text),elements=[];
 const highlight=value=>highlightResumeText(value,keywords).map((run,i)=>run.bold?<strong key={i}>{run.text}</strong>:run.text);
 for(let i=0;i<blocks.length;i++){
 const block=blocks[i],key=i;
 if(block.type==='skills'){elements.push(<ul className="resume-skills" key={key}>{block.items.map((item,index)=><li key={index}>{highlight(item)}</li>)}</ul>);continue;}
 if(block.type==='bullet'){const bullets=[];while(blocks[i]?.type==='bullet'){bullets.push(<li key={i}>{highlight(blocks[i].text)}</li>);i++;}i--;elements.push(<ul className="resume-bullets" key={key}>{bullets}</ul>);continue;}
 const tags={name:'h1',heading:'h2',entry:'h3',contact:'p',metadata:'p',paragraph:'p'};const Tag=tags[block.type];elements.push(<Tag className={`resume-${block.type}`} key={key}>{highlightableBlock(block.type)?highlight(block.text):block.text}</Tag>);
 }
 return <article className="paper ats-resume" aria-label="Tailored resume preview">{elements}</article>;
}
