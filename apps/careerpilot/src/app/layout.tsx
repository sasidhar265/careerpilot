import type {Metadata} from 'next';
import './globals.css';
import {AuthSessionSync} from '@/components/auth-session-sync';
import {ThemeInitializer} from '@/components/theme-controls';
export const metadata:Metadata={title:{default:'CareerPilot AI',template:'%s · CareerPilot AI'},description:'Discover UK opportunities, understand your fit, and build evidence-based applications.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-GB"><body><ThemeInitializer/><AuthSessionSync/><a href="#main" className="skip-link">Skip to content</a>{children}</body></html>;}
