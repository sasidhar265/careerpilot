'use client';
import {AccountMenu as SharedAccountMenu} from '@legacy/src/AccountMenu.jsx';
export function AccountMenu(props:{name:string;email?:string|null;local?:boolean}){return <SharedAccountMenu {...props}/>;}
