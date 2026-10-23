import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva,type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
const variants=cva('inline-flex items-center justify-center gap-2 min-h-11 rounded-xl px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',{variants:{variant:{default:'bg-primary text-primary-foreground hover:opacity-90',outline:'border border-border bg-card text-foreground hover:bg-muted',ghost:'text-muted-foreground hover:bg-muted'}},defaultVariants:{variant:'default'}});
export function Button({className,variant,asChild=false,...props}:React.ComponentProps<'button'>&VariantProps<typeof variants>&{asChild?:boolean}){const Component=asChild?Slot:'button';return <Component className={cn(variants({variant,className}))} {...props}/>;}
