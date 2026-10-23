import type {ReactNode} from 'react';
import {Compass} from 'lucide-react';
export function EmptyState({title,description,action}:{title:string;description:string;action?:ReactNode}){return <section className="empty-state"><span className="empty-icon"><Compass size={26} aria-hidden="true"/></span><h2>{title}</h2><p>{description}</p>{action&&<div className="mt-5">{action}</div>}</section>;}
