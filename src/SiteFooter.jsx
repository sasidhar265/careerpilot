import React from 'react';
import {FOOTER_TAGLINE,copyrightNotice} from './site-copy.js';
export function SiteFooter(){return <footer className="site-footer"><p className="site-footer-message">{FOOTER_TAGLINE}</p><small className="site-footer-copyright">{copyrightNotice()}</small></footer>;}
