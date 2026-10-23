import {cleanSingleLine} from '@/lib/profile-whitespace.mjs';
export function ProfileBulletList({text,label,columns=1,splitInline=false}:{text:string;label:string;columns?:1|3|4;splitInline?:boolean}){
 const items=text.split(splitInline?/[\r\n,;|•]+/:/[\r\n;•]+/).map(value=>cleanSingleLine(value.replace(/^\s*(?:[-*]\s+|\d+[.)]\s+)/,''))).filter(Boolean);
 if(!items.length)return <span className="text-muted-foreground">Not added. Use Edit profile to add this detail.</span>;
 return <ul aria-label={label} className={`grid list-disc grid-cols-1 gap-x-6 gap-y-1 pl-5 ${columns===3?'sm:grid-cols-2 lg:grid-cols-3':columns===4?'sm:grid-cols-2 lg:grid-cols-4':''}`}>{items.map((item,index)=><li key={index} className="min-w-0 whitespace-normal break-words pl-1 text-sm leading-6 marker:text-primary">{item}</li>)}</ul>;
}
