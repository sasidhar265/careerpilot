import {compileRoutes} from './compile-routes.mjs';
process.exitCode=await compileRoutes({name:'careerpilot-guest-route-check',sources:['src/app/api/guest/[...path]/route.ts']});
