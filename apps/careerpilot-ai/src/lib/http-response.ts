/** Private API failures must never be cached by a browser, intermediary or CDN. */
export function privateJson(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
