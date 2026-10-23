export function readablePdfText(items){
 const text=items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('');
 // Short but readable title pages do not require OCR. Page numbers alone do.
 const words=text.match(/\p{L}{2,}/gu)||[];
 return {text,needsOcr:words.length<3||words.join('').length<10};
}
