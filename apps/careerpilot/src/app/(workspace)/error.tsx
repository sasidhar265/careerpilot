'use client';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {EmptyState} from '@/components/ui/empty-state';
export default function WorkspaceError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <EmptyState title="We couldn’t load this part of your workspace." description="The service may be temporarily unavailable or still being configured. Your saved data has not been cleared." action={<div className="flex flex-wrap items-center justify-center gap-5"><Button onClick={reset}>Try again</Button><Link className="text-link text-sm" href="/dashboard">Return to dashboard</Link></div>}/>;}
