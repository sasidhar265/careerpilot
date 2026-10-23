import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {loadConfiguration} from './config.js';
import {createApiHandler} from './api-handler.js';
export {createApiHandler} from './api-handler.js';
export function createApiServer(options={}){const {handler,jobs}=createApiHandler(options),server=createServer(handler);server.on('listening',()=>jobs.start());server.on('close',()=>jobs.stop());return server;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){loadConfiguration();createApiServer().listen(3001,'127.0.0.1',()=>console.log('AI server: http://127.0.0.1:3001'));}
