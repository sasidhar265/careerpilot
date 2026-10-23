# Release verification report

23 October 2026. **Release gate failed / incomplete**, not a production pass.

| Check | Actual result |
|---|---|
| `npm --prefix apps/careerpilot test` | **82 passed, 0 failed, 0 skipped**, native Node tests |
| `npm test` | **163 passed, 0 failed**, existing application regressions |
| esbuild syntax checks | 159 application/config/test modules parsed; browser bundle checks passed for four affected entry points. This is not TypeScript checking. |
| Real document tests | Actual generated DOCX/searchable PDF, text re-extraction, source preservation and malformed archive checks executed in native suite |
| `npm --prefix apps/careerpilot install --ignore-scripts --fetch-retries=0 --fetch-timeout=10000` | Failed: ENOTFOUND registry.npmjs.org; no app lockfile generated |
| `npm --prefix apps/careerpilot run lint` | Failed to start: ESLint missing (127) |
| `npm --prefix apps/careerpilot run typecheck` | Failed to start: Prisma missing (127) |
| `npm --prefix apps/careerpilot run build` | Failed to start: Prisma missing (127) |
| `npm --prefix apps/careerpilot run db:migrate` | Failed to start: Prisma missing (127); migration SQL not runtime verified |
| Optional integration discovery | **5 skipped**, zero database scenarios executed; not passes |
| `npm --prefix apps/careerpilot run test:integration:required` | Exit 1: explicit isolated database absent |
| `npm --prefix apps/careerpilot run test:e2e` | Exit 1: local @playwright/test CLI module missing |
| `npm --prefix apps/careerpilot run test:e2e:journey` | Exit 1: explicit isolated database absent |
| `npm --prefix apps/careerpilot run preflight` | Exit 1: missing app configuration, lockfile/client. Syntax/presence report only; cannot certify readiness |
| PostgreSQL runtime | Installed 16.14 binary, no service. Two fresh temporary initdb attempts failed with shmget Operation not permitted |
| Docker runtime | CLI present; daemon socket unavailable. Image, Compose services and health not executed |
| Root `npm audit --omit=dev --audit-level=high` | Exit 1: advisory endpoint DNS ENOTFOUND |
| App `npm audit --omit=dev --audit-level=high` | Exit 1: ENOLOCK. Vulnerability status unknown |
| Real identity/AI/ATS/provider smoke | Not executed; configuration and credentials required |
| Accessibility/mobile visual inspection | Not executed; Playwright assertions implemented only |

Native tests exercise deterministic scoring/evidence, parser behavior, encrypted original handling, real exports, provider error handling, safe deployment validation and isolated external fixtures. They do not establish Prisma compatibility, database persistence, actual user isolation at runtime or rendered UI correctness.

## Added release automation

`tests/e2e/primary-journey.spec.ts` connects login → real DOCX upload → fact confirmation → job selection → JD review/evidence → tailored approval → valid exports → manual application/interview → logout/return. Isolated signed identity/structured AI fixtures are explicitly labelled and never imported into production application source. Malformed AI/provider failure, byte preservation, mobile navigation and expiry assertions are included.

`test:integration:required` and `test:e2e:journey` reject absent dedicated PostgreSQL configuration. `.github/workflows/careerpilot-release.yml` defines dependency/lock, migration, type/lint/unit/integration/build/browser/audit/container gates. The workflow has **not run** and intentionally fails until a reviewed app lockfile is available.

Run commands and staging acceptance are in [the runbook](PRODUCTION_RUNBOOK.md). Resolve failures and attach a fresh report before changing the NO-GO decision. Retain browser traces privately: they may contain candidate data. Test fixtures are synthetic and labelled; never run these destructive cleanup suites against production.

Final bundle rerun used the actual application-tracker, profile-workspace, match-workbench and resume-builder entries: all four passed. An initial invocation used two nonexistent entry names and failed resolution; correcting those names resolved the tooling invocation error. No application type/build gate is inferred from bundling.


## Follow-up: local authentication

After the original audit, app packages and an app lockfile became available in the workspace. Earlier missing-package findings above are historical results, not the current blocker. No package version/lockfile compatibility certification is inferred.

Added native real-file auth tests and a local-only browser suite; the native suite now passes **88 tests**. `npm --prefix apps/careerpilot run lint` now passes after correcting an anonymous PostCSS export, unused type import and unchanged diagnostics binding. Typecheck/build/Prisma generation now start but fail reaching `binaries.prisma.sh` (ENOTFOUND). Local Playwright starts Next but the sandbox rejects its listening socket with EPERM; manual dev startup likewise fails, including an explicit 127.0.0.1 bind. Browser assertions remain unexecuted. No working browser sign-in is claimed from these native results. See [local authentication](LOCAL_AUTH.md) for enabled configuration and exact scope.


## Follow-up: database-free guest workflow

167 root tests and 89 app native tests pass; Next lint passes. Root `npm run build` succeeds with the existing >500 kB chunk warning. Added isolated browser-key, draft recovery/validation, export/clear preservation, metric and local-origin tests. The dedicated guest Playwright scenario has not executed its assertions: initial manual guest startup encountered backend watch EMFILE; guest mode now disables backend watch. Subsequent Playwright startup is blocked by the sandbox's localhost listen EPERM. Guest is the existing Vite/local-backend workflow; none of these results certifies the newer PostgreSQL modules in guest mode. See [guest documentation](GUEST_MODE.md).


## Follow-up: landing authentication dialogs

Native app suite: **91 passed, zero failures/skips**. New cases cover distinct local registrations, duplicate email normalization, concurrent duplicate rejection and session isolation. Next lint passes. An isolated `tsc --noEmit` project including the dialog and its UI dependencies passes; route/test syntax and browser bundling pass. This does not replace the full Prisma-backed typecheck/build gate. The local Playwright journey was updated for landing pop-ups and existing foundation/primary journey redirect assertions were adjusted. Browser execution remains blocked by listen EPERM; focus/visual assertions are unexecuted.


## Follow-up: broken Continue as guest button

Root cause confirmed in configuration/process inspection: landing navigation depended on a separate localhost:5173 service, while only the CareerPilot listener existed. Guest now serves on the CareerPilot origin at `/guest`; APIs use real in-process handlers under `/api/guest/*`, not a second server. 172 root tests and 91 app tests pass, including actual socket-free catalogue/health/body-validation, private-path/origin rejection and API URL mapping. Initial root execution had five failures because the component harness rejected the new shared HTTP adapter import; adding the actual adapter to the loader fixed those failures without weakening assertions. Guest build succeeds with the existing large-chunk warning; isolated guest route/config TypeScript passes. Browser entry regression now targets Next and the actual landing guest button; actual rendered verification remains blocked by local network/listen restrictions.

Final socket-free verification called the actual compiled `/guest` HTML route: HTTP 200, no-store headers and all referenced generated script/style/favicon files present. No secondary process was used. The Playwright server still fails listen EPERM on 127.0.0.1:3103. The first lint run after asset generation tried to parse generated minified vendor bundles and crashed; added the generated output directory to ESLint's ignores and reran lint. Source files remain checked.


## Follow-up: shared application theme

175 root tests and 91 app tests pass. Theme tests cover shared storage, actual binding/system changes, cleanup and storage-denied fallback. App lint and focused UI/theme TypeScript pass. The actual Next Tailwind/PostCSS pipeline compiles the shared stylesheet; root/guest production bundles build with the existing chunk-size warning. A new browser test compares computed body background/font/primary colour and checks retained light/dark preferences between landing and guest pages, plus mobile overflow. Playwright again fails to bind 127.0.0.1:3103 (EPERM); none of those rendered assertions has executed. Resume/export regression tests remain passing.


## Follow-up: invalid search response

Confirmed from Next's server diagnostics that the guest route failed compilation resolving standalone configuration and runtime `.data` paths as static assets, returning HTML instead of JSON. Extracted the reusable API handler from startup, supplied filesystem paths at runtime, and excluded runtime-managed reads from asset tracing. The catalogue and private files were not modified.

180 root tests and 91 app tests pass. New regression cases exercise a real keyword result through the handler/bridge/client parser, malformed HTML and JSON envelopes, and recovery through the actual Retry search handler. Guest bundle and isolated TypeScript checks pass. The real guest route now passes an isolated Next 16.4.2 Turbopack compile (`test:guest:compile`) without module-resolution errors or tracing warnings. Its temporary fixture is removed after the check. This does not establish the full Prisma-backed application build or live provider/browser acceptance. An initial lint attempt raced cleanup of an ad hoc compile scratch directory and failed ENOENT; lint was rerun after cleanup and the reusable check's scratch directory is explicitly ignored.


## Follow-up: registration “expected pattern” error

Root cause verified in server diagnostics: missing generated Prisma client in a transitive import from the local-auth route. Returned HTML produced a raw browser JSON exception. Refactored local auth to database-free cookie/session/page/logout modules without changing OIDC persistence, original account files or cookie policy.

Results: **94 native app tests pass**. Added HTML/invalid auth response, redirection guard and browser-error sanitization cases. `test:auth:local` passes using the actual POST handler, real Next cookie setters and client parser: private-file registration, valid login, real stored-session lookup, special-character/Unicode password, duplicate email (409), wrong password (401), mismatched confirmation (400), foreign origin (403), with DATABASE_URL empty. Temporary synthetic account storage is deleted. `test:auth:compile` successfully compiles the real registration/local-logout/local-account/modal graph with Next/Turbopack, no PostgreSQL/generated Prisma required. Initial compiler warnings about runtime account-file tracing were addressed with explicit runtime exclusions. Lint and focused local auth/page/component TypeScript pass. Playwright still cannot bind 127.0.0.1:3102 (EPERM), so browser assertions remain unexecuted. Full database-backed application checks remain separate.


## Follow-up: account creation Origin rejection

The previous exact string comparison rejected localhost/IP variants of the same local app. Added shared, explicitly enabled loopback-alias validation for development file mode. It requires matching configured scheme/port and actual request authority, rejects cross-site/missing/malformed/foreign origins, and leaves production/OIDC exact-origin behavior intact. Local auth native redirects preserve the validated origin so a successful IP-hosted login retains its cookie. Embedded guest APIs share the policy.

185 root and 94 app native tests pass. Extended actual POST/Next cookie/parser verification passes for IP registration and stored-session lookup, native redirect preservation, wrong-port refusal and production strictness. Local auth compiler/focused types/lint checks pass. Added real browser IP registration/logout/cookie and origin-rejection assertions; their rendered execution remains blocked by sandbox port restrictions.


## Follow-up: screenshot of broken account styling

Corrected component style loading, native disclosure layout and clipped appearance text. Lint passes. Focused TypeScript initially lacked Next's CSS-module ambient declaration in its temporary narrowed project; including the installed Next global declaration fixed that harness error. Component browser build emits its CSS, component PostCSS checks pass and isolated Next Webpack account/auth compilation succeeds. Default Turbopack account compilation **fails EPERM** starting its CSS/PostCSS worker port; full Turbopack verification remains blocked. Browser installation in an isolated /tmp directory **fails ENOTFOUND cdn.playwright.dev**; visual testing remains unexecuted. Added actual-browser assertions for the screenshot's missing avatar styling and stacked-control geometry. Guest bundle rebuilt after the shared theme control width change.


## Follow-up: hide visitor-mode content after sign-in

187 root and 94 app tests pass. New redirect tests permit only server-confirmed `/local-account` or `/dashboard` destinations and preserve response bodies. Actual file-auth handler/cookie checks now exercise active, invalid and revoked account lookup; they pass without a database. Lint, focused TypeScript, rebuilt guest assets and isolated Next Webpack landing/account compilation pass. Guest entry guards and the legacy entry rewrite are server-controlled; no cookie-presence heuristic or localStorage authentication flag is used.

Added an actual PostgreSQL session owner/expiry/revocation test and expanded browser scenarios to assert no visible guest wording after sign-in, no guest action on the authenticated landing page, guest page/legacy URL redirects and API denial. These environment-dependent scenarios are not certified by the native checks. OIDC lookup reads the existing User/Session schema with bound hashed-token/UTC-expiry parameters; real PostgreSQL validation remains required.

Latest database integration discovery: **6 skipped, zero executed**, because no isolated PostgreSQL connection is configured. These skips are not passing persistence/SQL verification.

### Profile editing verification — 23 October 2026
- Application unit suite: **97 passed, 0 failed**. New tests verify persisted name/email edits, password confirmation, duplicate emails, stable credentials and identity, session ownership/expiry/revocation, and concurrent-update conflicts using isolated temporary stores.
- ESLint and focused local-auth/UI/API TypeScript checks passed.
- Isolated production Webpack compilation passed for the actual home, local account, registration, logout and profile PATCH routes. This does not establish a full database-dependent application build.
- Added Playwright coverage for cancel/save/reload and sign-in after an email change. Not executed in this environment because of the previously documented server-port and browser availability restrictions.

### Expanded profile verification — 23 October 2026
- **99 unit tests passed, zero failures.** New checks cover old-account defaults, career/contact persistence after reopening storage, isolation between accounts, stale career edits, revoked profile access, strict link/phone/length validation, unsupported extra fields, and draft content preservation/empty-section omission.
- ESLint and focused local-auth/UI/profile API TypeScript checks passed. Isolated Webpack route compilation passed; full database-dependent production build remains outside this verification.
- Playwright scenario extended for phone, location and career fields, reload, mobile overflow and text download. Attempted `npm --prefix apps/careerpilot run test:e2e:local-auth`; server startup failed with `listen EPERM 127.0.0.1:3102`, so browser rendering and interactions remain unverified here.

### Local resume import verification — 23 October 2026
- **102 unit tests passed, zero failures.** Includes genuine generated PDF/DOCX documents through the existing safe extractor into profile proposals, byte preservation, source-backed fields, chronology and uppercase role preservation, unrecognised layouts and oversized-section handling.
- ESLint, focused TypeScript and isolated Webpack compilation of the actual account, profile/import and auth routes passed. Full database-dependent build remains outside these checks.
- Added Playwright coverage for unauthenticated import rejection, real DOCX upload, required field selection/review confirmation, unchanged account email, explicit save and reload. Browser execution remains unverified because the local web server cannot bind port 3102 in this environment (previous EPERM failure).

### DOCX/PDF bundled-runtime regression — 23 October 2026
- Reproduced an extraction failure with the default Turbopack compiler: a static dependency `require.resolve` became a numeric module ID, which cannot be converted into a filesystem URL for the extraction worker. Direct Node tests and Webpack did not reproduce it.
- Fixed dependency resolution using a runtime resolver and Turbopack ignore annotation. Worker validation, archive limits and document security checks remain enabled.
- Added `npm --prefix apps/careerpilot run test:extraction:runtime`. It compiles an isolated Next route using the actual server extraction wrapper, then invokes its compiled handler with real generated DOCX and PDF bytes. Both formats pass with Turbopack and with `CAREERPILOT_CHECK_BUNDLER=webpack`. No network listener or database is needed. This is a compiled runtime check, not browser E2E or a full application build.
- All 102 application unit tests and focused TypeScript checks pass. Initial lint caught a prohibited script variable name; renamed before rerunning lint.
- Missing DOCX reader dependencies now report service unavailability separately from unreadable document content. Unreadable-content guidance suggests saving a fresh DOCX copy or a searchable PDF. No document text, filename or internal parser stack is logged or exposed.
- The user's specific document was not available for inspection; the reproduced bundler regression is resolved, while unusual or damaged files may still fail safe validation.

### Structured professional experience verification — 23 October 2026
- **106 unit tests passed, zero failures.** New coverage verifies separate employers/job titles and chronology, uncertain header handling, original role-source retention, old-profile defaults, exact six-category import proposals, array export, persistent role records and stale-edit rejection.
- Actual local-account and profile/import routes compile with isolated Webpack checks. Focused TypeScript and ESLint pass after removing an unused import flagged by the first lint run.
- The import Playwright scenario now selects Professional Experience, verifies no contact-number import option, and checks the editable job title and saved employer. Manual editing coverage uses Add role with individual title, employer and date fields. These browser scenarios remain unexecuted in this environment.

### Achievements visibility correction — 23 October 2026
- Found that empty saved career fields and fields missing from extraction were omitted from the UI. Both profile display and import review now retain the Achievements heading below Certificates with an honest empty state.
- Import review always lists the six requested categories in a fixed order. Missing values are disabled for import and may be added through Edit profile; no extracted data is fabricated.
- Verified actual component output through React server rendering using a certificate-only fixture: all six categories appear, Achievements follows Certificates, and missing fields are labelled. ESLint and focused TypeScript pass. Browser layout remains unverified here.

### SDET role parser verification — 23 October 2026
- **111 unit tests passed, zero failures.** Regression cases cover SDET/QA without dates, employer-first layouts, explicit Role/Job Title labels, numeric and month-name dates, multiple header orders, duty sentences mentioning other titles, per-role source preservation, and genuine multi-role PDF/DOCX extraction retaining C# content.
- ESLint and focused local-profile/import TypeScript passed.
- Specific user resume `NagaSai_SDET_Resume_C#` was not available for inspection. No claim is made that its exact layout has been validated. Parsing remains deterministic and tentative; users must review title/employer/date associations before saving.

### Personal/contact import verification — 23 October 2026
- **114 unit tests passed, zero failures.** Tests now verify separate personal/career proposals, source-backed contact values, explicit name/phone labels, date/header rejection, absent-field handling, and real PDF/DOCX extraction of names and telephone numbers.
- Focused local-profile/import TypeScript and ESLint pass. The profile/import route is included in the isolated route compilation check.
- Personal/contact import is opt-in and preserves the sign-in email. Recognition remains conservative: addresses/locations require explicit labels, links require HTTP(S), and unrecognised fields can be entered manually. User's specific resume and browser rendering remain unverified.

### Save changes verification — 23 October 2026
- **116 unit tests passed, zero failures.** Added checks for equivalent snapshot key ordering, preserved stale-write rejection, domain-only link normalization and client/server schema validation.
- **Actual API smoke passed:** `npm --prefix apps/careerpilot run test:profile:save` bundles the actual PATCH handler, supplies real Next cookie request context, and saves imported address and SDET role data to an isolated private file store. Reopening the store confirms persistence. Checks include invalid data (400), stale edits (409), invalid session (401) and disallowed origin (403).
- ESLint and focused TypeScript passed. The existing browser edit scenario now supplies a domain-only LinkedIn URL; browser execution remains unverified due to the documented server restrictions.
- No real account data or credentials were read or altered during these checks. The exact reported browser interaction was not directly observed.

### Saved-profile PDF verification — 23 October 2026
- **117 unit tests passed, zero failures.** New PDF test checks PDF signature, exact text re-extraction, contact information, separate role details, C# content, Certificates/Achievements ordering and profile immutability.
- `test:profile:save` now also invokes the real PDF GET handler with Next session cookies. Verified `application/pdf`, PDF attachment filename, readable saved address/role content, unchanged storage bytes and 401 for invalid sessions.
- `test:extraction:runtime` now executes compiled Next PDF generation and source-text validation, passing under Turbopack alongside the existing DOCX/PDF extraction checks. Initial harness failures from Next navigation resolution and lazy userland access were fixed; final runtime and API checks pass.
- ESLint and focused TypeScript passed. Browser E2E expects `CareerPilot-CV.pdf`; browser execution remains unverified in this environment. Full database-dependent application build remains outside these checks.

### Profile resume preview verification — 23 October 2026
- Actual local-account/profile PDF routes compile in the isolated Webpack check; focused TypeScript passes.
- Initial ESLint caught synchronous loading resets in the preview effect. Moved resets into the Retry event handler and reran lint.
- Added browser assertions for the preview, PDF MIME type and Open PDF blob link. Browser execution and native PDF-viewer appearance remain unverified in this environment. Existing authenticated PDF-generation and re-extraction backend checks underpin the preview source.

### Visible whitespace changes — 23 October 2026
- **122 unit tests pass**, including editor-side whitespace cleanup, preserved source evidence and original draft immutability. Focused TypeScript and lint pass.
- Added browser scenario selecting Clean spacing and asserting a role's responsibilities change from repeated spaces to normalized text. Browser execution remains unverified because of local-server restrictions.
- Profile display normalizes existing editable text without silently rewriting the stored account. Explicit Save changes commits the cleaned draft. Visual gaps between UI containers remain separate from text whitespace; a clarification was requested to distinguish these concerns.

### Tools & Technologies groups — 23 October 2026
- **125 unit tests passed, zero failures.** Added legacy/group parsing, heading/body limits, older-profile defaults, whitespace cleanup and real PDF text-preservation coverage.
- Actual PATCH/GET smoke checks save two tool groups, verify returned headings and persist them, then re-extract their exported PDF bullet content. Auth/session/origin/stale-write checks continue passing.
- Focused TypeScript and lint pass (fixed initially implicit callback types). Isolated Webpack compilation passes. React server rendering verifies four groups produce two table rows, each with three cells, and the expected bullet items.
- Playwright scenario now adds three tool groups through the editor and expects a three-cell saved table; browser execution remains unverified in this environment.

### Modern account page checks — 23 October 2026
- Focused local-account/UI TypeScript, ESLint and isolated Webpack route compilation passed.
- Actual save/PDF smoke checks continue to verify persistence, extraction/content preservation and authentication using isolated temporary stores.
- Playwright was attempted and failed before test execution because the configured test server could not bind `127.0.0.1:3102` (`EPERM`). No browser rendering, screenshots or computed layout/a11y results are claimed.
- Existing contact/career fields and all persistence/download endpoints remain connected. No production data was read or changed to validate the redesign.

### Executive CV document verification — 23 October 2026
- **130 unit tests passed, zero failures.** New tests validate genuine executive PDF/DOCX bytes, exact source text and multi-page content preservation.
- Actual profile PDF/save handler smoke passed using isolated accounts. Account downloads now invoke executive-uk; PDF content is re-extracted and compared before serving.
- Compiled Next/Turbopack executive PDF generation and document extraction passed; lint and focused TypeScript passed. These checks do not establish browser E2E or a full database-dependent app build.
- Created an illustrative PDF from the existing Alex Example test fixture and rendered its first page with PDF.js/canvas for visual inspection. Source reference product images could not be retrieved, so no pixel-level matching claim is made.

### Technical Skills PDF columns — 23 October 2026
- **132 unit tests passed, zero failures.** Added PDF.js geometry assertions confirming separate columns at the same baseline, odd-list retention and wrapped-item content preservation.
- Skills remain searchable in source order; every PDF is still re-extracted and compared before serving. Lint, focused TypeScript and actual save/PDF checks pass.
- Regenerated validation/careerpilot-executive-preview.pdf using fictional sample skills and visually inspected its first page. Executive PDFs now have two columns within Technical Skills; the remaining sections retain their prior layout.

### Tools PDF column verification — 23 October 2026
- **135 unit tests passed, zero failures.** New tests confirm tools headings share a row at different x positions, bullets sit below their heading, odd group content survives and subsequent education remains intact.
- Legacy comma-separated tools now export as distinct bullets; an existing assertion was updated to verify both tool names independently. Exact source-text re-extraction validation remains enabled.
- Actual profile PDF/save handler smoke, ESLint and focused TypeScript pass. Illustrative sample PDF was regenerated and its first page visually checked using PDF.js rendering; browser preview remains subject to the existing environment limitation.

### In-app PDF preview checks — 23 October 2026
- Focused TypeScript and ESLint passed after removing an option no longer present in the installed PDF.js browser API types.
- Isolated Webpack app compilation passed, including the client viewer and worker route. Moved worker resolution into the established runtime .mjs resolver to avoid bundler path rewriting/warnings.
- Compiled Turbopack runtime checks passed: real PDF generation/text validation, DOCX/PDF extraction and same-origin worker response (200, JavaScript MIME type and actual dependency bytes).
- Playwright flow now expects canvas page 1 and no Edit profile button in the Resume preview tab. Its execution, pixel appearance and real browser worker loading remain unverified because the configured local server cannot bind its test port in this environment.

### PDF contact data checks — 23 October 2026
- **138 unit tests passed, zero failures.** Tests verify all requested header fields survive searchable PDF generation, town/country remain visible with a street address, PDF link annotations are valid, legacy Git/Location values remain compatible and Git links are not duplicated.
- Updated contact-import expectations to use the new dedicated Git field instead of treating GitHub as Portfolio.
- Actual profile PATCH/PDF handler smoke persists Town, Country, Git URL and phone and confirms their exported text. Focused TypeScript and ESLint pass. PDF header link tests were rerun after preserving complete link targets for wrapped URLs.

### Image-reference PDF layout verification — 23 October 2026
- **142 unit tests passed, zero failures.** New tests verify left/right section coordinates, clickable contact URLs, source-profile immutability, independent multi-page text preservation, missing optional data and wrapped header content.
- Actual authenticated save/PDF smoke passes with the new renderer. A prior raw substring assertion for a long URL was updated to ignore line-wrap whitespace; the complete target remains in PDF link annotations and is independently tested.
- Compiled Turbopack checks pass for the new reference-layout PDF, per-column content verification and the local preview worker. Focused TypeScript and ESLint pass. Added the temporary save-check directory to ESLint ignores after an overlapping cleanup caused an initial ENOENT scan failure.
- Visually inspected the rendered illustrative sample. One combined sample-generation/native-canvas process hit incompatible Path2D bindings; rendering the saved PDF in a fresh canvas process passed. No real browser-rendering or full deployment-build claim is made.
