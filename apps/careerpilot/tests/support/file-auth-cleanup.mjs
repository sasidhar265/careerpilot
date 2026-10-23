import {rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,basename,resolve} from 'node:path';
export default async function cleanup(config){const directory=config.metadata.fileAuthTestDirectory;if(typeof directory==='string'&&dirname(resolve(directory))===resolve(tmpdir())&&basename(directory).startsWith('careerpilot-local-e2e-'))await rm(directory,{recursive:true,force:true});}
