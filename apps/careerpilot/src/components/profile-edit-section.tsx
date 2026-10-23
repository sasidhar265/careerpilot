import type {ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import styles from './profile-edit-section.module.css';
export function ProfileEditSection({title,children,defaultOpen=false,id}:{title:string;children:ReactNode;defaultOpen?:boolean;id?:string}){return <details data-profile-edit-section className={styles.section} open={defaultOpen}><summary id={id} className={styles.summary}><span>{title}</span><ChevronDown size={17} aria-hidden="true"/></summary><div className={styles.content}>{children}</div></details>;}
