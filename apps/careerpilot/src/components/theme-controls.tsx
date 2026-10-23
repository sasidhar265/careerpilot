'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {ChevronDown,Monitor,Moon,Sun} from 'lucide-react';
import {readTheme,writeTheme,subscribeTheme,serverTheme,bindTheme} from '@legacy/src/theme.js';
export function ThemeInitializer(){const value=useSyncExternalStore(subscribeTheme,readTheme,serverTheme);useEffect(()=>bindTheme(value,document.documentElement,window.matchMedia('(prefers-color-scheme: dark)')),[value]);return null;}
export function ThemeControls({compact=false}:{compact?:boolean}){const value=useSyncExternalStore(subscribeTheme,readTheme,serverTheme);const Icon=value==='dark'?Moon:value==='light'?Sun:Monitor;return <label className={compact?'theme-control':'form-stack'}><span className={compact?'sr-only':''}>Appearance</span><span className="theme-select"><Icon className="theme-select-icon" size={16} aria-hidden="true"/><select aria-label="Appearance" value={value} onChange={event=>writeTheme(event.target.value)}><option value="system">System theme</option><option value="light">Light mode</option><option value="dark">Dark mode</option></select><ChevronDown className="theme-select-chevron" size={14} aria-hidden="true"/></span></label>;}
