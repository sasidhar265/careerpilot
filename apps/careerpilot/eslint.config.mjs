import {defineConfig,globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([...nextVitals,...nextTs,globalIgnores(['.profile-save-check-*/**','.local-auth-check-*/**','.route-compile-check-*/**','.guest-route-check-*/**','public/guest-assets/**','.next/**','src/generated/**','playwright-report/**','test-results/**','next-env.d.ts'])]);
