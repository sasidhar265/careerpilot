import Link from 'next/link';
export default function NotFound(){return <main id="main" className="mx-auto max-w-xl px-6 py-20"><h1>This page isn’t available.</h1><p className="muted my-5">The resource may have moved or may not belong to your account.</p><Link href="/dashboard" className="text-link">Back to your dashboard</Link></main>;}
