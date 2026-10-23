import {FOOTER_TAGLINE,copyrightNotice} from '@legacy/src/site-copy.js';
import {cn} from '@/lib/utils';
export function SiteFooter({className}:{className?:string}){return <footer className={cn('site-footer',className)}><p className="site-footer-message">{FOOTER_TAGLINE}</p><small className="site-footer-copyright">{copyrightNotice()}</small></footer>;}
