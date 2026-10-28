import * as React from 'react';
import {cn} from '@/lib/utils';
export function Input({className,...props}:React.ComponentProps<'input'>){return <input className={cn('w-full rounded-[var(--radius-control)] border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',className)} {...props}/>;}
export function Textarea({className,...props}:React.ComponentProps<'textarea'>){return <textarea className={cn('min-h-28 w-full resize-y rounded-[var(--radius-control)] border border-border bg-card px-3 py-2.5 text-sm leading-7 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',className)} {...props}/>;}
