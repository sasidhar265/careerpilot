 'use client';
import {Button} from '@/components/ui/button';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main id="main" className="mx-auto max-w-xl px-6 py-20"><h1>We couldn’t load this view.</h1><p className="muted my-6">The service may be unavailable or still being configured. Your saved data has not been cleared.</p><Button onClick={reset}>Try again</Button></main>;}
