'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {AUTH_REFRESH_KEY} from '@legacy/src/auth-events.js';
/** Revalidate server-rendered account navigation when returning to an older tab. */
export function AuthSessionSync(){const router=useRouter();useEffect(()=>{let pending:ReturnType<typeof setTimeout>|undefined;const refresh=()=>{if(document.visibilityState==='hidden')return;clearTimeout(pending);pending=setTimeout(()=>router.refresh(),50);};const changed=(event:StorageEvent)=>{if(event.key===AUTH_REFRESH_KEY)refresh();};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);window.addEventListener('storage',changed);return()=>{clearTimeout(pending);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('storage',changed);};},[router]);return null;}
