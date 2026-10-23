export const THEME_KEY='careerpilot-theme';
export const THEME_EVENT='careerpilot-preferences';
let temporaryTheme='system';
const valid=value=>['system','light','dark'].includes(value);
export function readTheme(storage){try{const value=(storage??globalThis.localStorage).getItem(THEME_KEY);return valid(value)?value:temporaryTheme;}catch{return temporaryTheme;}}
export function writeTheme(value,storage){if(!valid(value))throw Error('Unknown appearance preference.');temporaryTheme=value;try{(storage??globalThis.localStorage).setItem(THEME_KEY,value);}catch{/* Preserve the choice for the current page when storage is unavailable. */}if(typeof window!=='undefined')window.dispatchEvent(new Event(THEME_EVENT));}
export function subscribeTheme(callback){if(typeof window==='undefined')return ()=>{};window.addEventListener(THEME_EVENT,callback);window.addEventListener('storage',callback);return ()=>{window.removeEventListener(THEME_EVENT,callback);window.removeEventListener('storage',callback);};}
export function serverTheme(){return 'system';}
export function resolveTheme(preference,darkSystem){return preference==='system'?(darkSystem?'dark':'light'):valid(preference)?preference:'light';}
export function bindTheme(preference,root,media){const apply=()=>{root.dataset.theme=resolveTheme(preference,media.matches);};apply();media.addEventListener('change',apply);return ()=>media.removeEventListener('change',apply);}
