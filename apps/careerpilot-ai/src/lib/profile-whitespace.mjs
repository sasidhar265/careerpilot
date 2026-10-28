// Clean editable resume text without flattening paragraphs or altering source evidence.
export function cleanResumeText(value){return value.replace(/\r\n?/g,'\n').split('\n').map(line=>line.replace(/[\t\v\f\p{Zs}]+/gu,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim();}
export function cleanSingleLine(value){return cleanResumeText(value).replace(/\s+/gu,' ').trim();}
