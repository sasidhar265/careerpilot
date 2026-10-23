import type {ComponentProps} from 'react';
import {cn} from '@/lib/utils';
export function Card({className,...props}:ComponentProps<'section'>){return <section className={cn('rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6',className)} {...props}/>;}
