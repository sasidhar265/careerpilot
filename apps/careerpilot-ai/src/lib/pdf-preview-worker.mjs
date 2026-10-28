import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const runtimeRequire=createRequire(import.meta.url);
function resolveDependency(name){return runtimeRequire.resolve(/* turbopackIgnore: true */ name);}
export function readPreviewWorker(){return readFile(resolveDependency('pdfjs-dist/build/pdf.worker.min.mjs'));}
