# Built-in local guest workspace

Guest mode now runs **inside CareerPilotAI on the same origin**, at `/guest`. The earlier link to a separate server on port 5173 failed when that server was not running. That architecture has been replaced for the landing-page guest action.

## Run

From the repository root:

```sh
npm run careerpilot:dev
```

Open `http://localhost:3100` while signed out and choose **Continue as guest**. No second server, PostgreSQL, Prisma generation or sign-in is required for the guest workflow. Restart an already-running CareerPilotAI process once to pick up the startup/build changes. The `predev` step builds the actual existing guest React workspace into the application's public assets; `/guest` serves its HTML directly. `prebuild` also bundles the assets, and the container configuration copies them. `npm --prefix apps/careerpilot-ai run guest:build` can rebuild just that bundle. `GUEST_WORKSPACE_URL` is obsolete and ignored.

The legacy standalone `npm run guest:dev` remains available for compatibility, but it is not required for the landing-page button. Browser records on that previous port remain on that origin; they are not silently migrated to port 3100. Existing Next accounts and guest browser keys are preserved.

## Available guest workflow

The existing local modules provide job discovery/filtering, manual saved jobs/application tracking, pasted JDs, PDF/DOCX/image extraction, configured-provider JD analysis/matching/tailoring, manual resume editing, real PDF/DOCX exports and browser resume history. The guest dashboard calculates actual saved/current-stage/date counts. Typed drafts, tracker records and saved versions use scoped browser storage; export and confirmed clear actions affect only guest keys.

Guest API requests use `/api/guest/*`, bridged to the actual existing local handler in-process. No socket, remote proxy, fake responses or PostgreSQL adapter are involved. Only explicit legacy job/provider/AI endpoints are permitted; private account APIs are never forwarded. Origin checks apply, writes require an exact matching Origin, cookies/authorization are not forwarded, and errors are private/no-store. Embedded collection is manual (Refresh sources), not an unstarted automatic refresh promise. Default source/provider configuration is the actual app process environment; no hidden copy of root secrets is performed.

AI actions still need a configured provider; provider/network/quota failures remain errors. Live jobs require reviewed configured sources and network access. Unknown freshness is not labelled live. Opening an employer URL does not record a submission.

## Scope and privacy

The newer PostgreSQL structured-profile confirmations, immutable version/evidence audit, advanced Kanban/dashboard and career chat remain in the account workspace. The guest matching engine is the existing local workflow. No official ATS result is implied. The tracker retains six stages; resume history retains the existing ten editing and ten final versions. Original uploaded files are not retained: re-upload them after a refresh. In-progress AI reports and unsaved edits are not fully restored. Export produces stored records; no import UI or cross-device sync is implemented.

Guest browser keys start with `careerpilot.guest.v1:`. Ordinary workspace keys/database records are not read, overwritten or cleared. The public jobs catalogue/employer configuration and installed provider are shared local services. Browser records are unencrypted and visible to anyone sharing that browser profile. Clearing browser data or changing origins can remove access. Supplied document text is sent to the selected AI provider when an AI action is requested. Keep sensitive exports private.

Production guest entry/API access is disabled, as are non-local application origins. Do not expose the development server as a public multi-tenant service. Authenticated Next routes retain their existing ownership checks.

## Verification

The initial separate-server design was defective when only CareerPilotAI was running. New tests exercise the actual catalogue/health/body-validation handlers in-process, scoped API URLs, cross-origin/write rejection, private-endpoint rejection and sanitized failures, without opening a listening socket. Existing component-handler regression harnesses now load the real shared HTTP adapter. The initial regression run failed five tests because that harness did not recognize the new adapter import; the harness was corrected and rerun, preserving all assertions.

Latest native counts: 172 root tests and 91 app tests pass. Guest asset build, app lint and isolated TypeScript checking of the guest routes/config pass. The bundle retains the known >500 kB chunk warning. Browser coverage now clicks Continue as guest on the actual landing page, requires `/guest`, calls the real same-origin guest health API, and checks manual application/draft persistence. Browser execution remains subject to sandbox localhost listen restrictions; no full rendered journey is claimed without that run. Next's complete Prisma-backed build/type/migration gates remain independent and unresolved.

Final socket-free verification called the actual compiled `/guest` HTML route: HTTP 200, no-store headers and all referenced generated script/style/favicon files present. No secondary process was used. The Playwright server still fails listen EPERM on 127.0.0.1:3103. The first lint run after asset generation tried to parse generated minified vendor bundles and crashed; added the generated output directory to ESLint's ignores and reran lint. Source files remain checked.


## Search returned an HTML error — integration correction

Server diagnostics identified an actual Next compilation failure: importing the standalone server entry pulled in its configuration bootstrap, and static `new URL(..., import.meta.url)` filesystem defaults were interpreted as build assets. Next returned an HTML compilation page, causing the guest search JSON parser to fail. This was not evidence of an empty catalogue.

Separated `server/api-handler.js` from `server/index.js` startup/configuration and switched the guest route to the reusable module. The guest route now supplies explicit runtime paths to the existing catalogue/employer files, preserving their contents. Standalone defaults use Node path operations; runtime-managed file reads are explicitly excluded from Turbopack asset tracing. No catalogue/configuration secrets are bundled as assets.

The UI validates real JSON/record envelopes, reports HTTP status for non-JSON failures without rendering server pages, and provides a working Retry search action. It no longer directs integrated guest users to the unrelated `npm run dev` command. Rebuilt guest assets include that correction.

Verification: 180 root tests and 91 app tests pass. Added actual handler→guest bridge→UI parser keyword coverage, HTML failure/retry recovery and invalid envelope/provider cases. `npm --prefix apps/careerpilot-ai run test:guest:compile` now builds an isolated project containing the real guest API route using Next/Turbopack, without PostgreSQL or a listening socket. The compile passes without the previous module-resolution/tracing warnings. This is an isolated compilation gate, not a full application build or rendered browser pass.


## Visitor-only access after account sign-in

Guest access is now reserved for unsigned visitors. Active account sessions hide the guest landing action and all guest promotions in authenticated navigation/cards. `/guest` redirects signed-in users; `/api/guest/*` returns an account destination without serving anonymous workspace data. The legacy `/guest-assets/index.html` entry is rewritten through that guard. An already-open built-in anonymous tab follows the server's authenticated redirect on API/focus/session-refresh checks. Anonymous data is preserved for later use after logout; it is not migrated into private account records. The legacy standalone application remains a separate development entry.
