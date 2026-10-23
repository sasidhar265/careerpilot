export function canonicalText(text:string):string;
export function generateDocument(text:string,format:'pdf'|'docx',template?:'classic-uk'|'compact-uk'|'executive-uk'):Promise<{bytes:Buffer;pages:number|null}>;
export function validatedDocument(text:string,format:'pdf'|'docx',template?:'classic-uk'|'compact-uk'|'executive-uk'):Promise<{bytes:Buffer;pages:number|null;validation:{format:string;characters:number;pages:number|null;status:string;diagnostics:{code:string;message:string}[]}}>;

export function loadFonts():Promise<Buffer[]>;
