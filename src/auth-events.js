/** A refresh notification only; authentication always comes from the server session. */
export const AUTH_REFRESH_KEY='careerpilot-session-refresh';
export function notifyAuthRefresh(){try{globalThis.localStorage.setItem(AUTH_REFRESH_KEY,String(Date.now()));}catch{/* Focus-based session checks still work when storage is unavailable. */}}
