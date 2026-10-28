# CareerPilotAI implementation plan

## Repository analysis and preservation

The existing project is a React 19/Vite application, a local Node HTTP API, three AI adapters, PDF/DOCX/OCR processing, resume exports/history, a UK employer registry, a JSON job catalogue and browser-local application notes. These remain supported by their existing root commands. No existing document, browser storage key, environment file or catalogue is migrated/deleted implicitly.

CareerPilotAI lives in `apps/careerpilot-ai`. Its PostgreSQL database is a separate system of record. Legacy catalogue import is explicit, repeatable and non-destructive; private browser data must be intentionally exported/imported by its owner. The new service must not expose the unauthenticated local legacy HTTP server publicly.

## Boundaries and dependencies

| Module | Boundary / dependencies | Acceptance criteria | Progress |
|---|---|---|---|
| Application shell | Next App Router, React, TypeScript, Tailwind, shadcn patterns | Own branding; persistent navigation; working login/dashboard/jobs/profile/resumes/tracker/assistant routes | Source implemented; runtime verification pending |
| Database | PostgreSQL, Prisma 7, pg adapter | Versioned schema/migration; no production seed or destructive automatic migration | Source implemented; runtime verification pending |
| Authentication | Standards-based OIDC via openid-client; opaque database sessions | PKCE/state/nonce; short-lived encrypted login state; secure cookies; logout invalidates session | Source implemented; runtime verification pending |
| Ownership | Server services + user-scoped queries | No client-supplied owner IDs; private reads/writes require a session; cross-owner IDs return 404 | Source implemented; runtime verification pending |
| Discovery | Shared employer adapters → ingest worker → PostgreSQL | Actual employer postings only; filters/page links backed by DB; no fixture vacancies in production | Source implemented; runtime verification pending |
| Candidate profile | Session-owned profile and versioned master resumes | Persistent forms; validation; profile never shared across accounts | Source implemented; runtime verification pending |
| Documents | Bounded PDF/DOCX ingestion → extracted text | Type/size validation, archive expansion limits; extraction failures visible; no raw uploads retained | Source implemented; runtime verification pending |
| Resume builder / JD match | Existing provider adapters + validated AI contract | Exact-quote evidence checks; preserve source facts; editable version saved; actual exports | Source implemented; runtime verification pending |
| Recommendations | Profile overlap baseline + explicit AI fit review | Explain baseline honestly; provider review only on request; no fabricated AI confidence | Source implemented; runtime verification pending |
| Tracker | Session-owned applications | Persist status/notes; validate job IDs; cross-owner updates denied | Source implemented; runtime verification pending |
| Career assistant | Provider interface + owned conversation storage | Ground in provided profile/resume; separate evidence; missing configuration returns honest error | Source implemented; runtime verification pending |
| Operations | Docker/Compose, env templates, checks | Non-root application; Postgres health check; explicit migration; no secrets in image/source | Source implemented; runtime verification pending |
| Verification | Unit, Playwright, lint, types, build | Auth/ownership tests; synthetic fixtures confined to tests; report checks actually run | Source implemented; runtime verification pending |

## Delivery sequence

1. Preserve the legacy app; add the new independent package/configuration.
2. Add schema, SQL migration, auth/session security and validated server services.
3. Implement shared UI, functional shell, profile/resume/tracker/job workflows.
4. Bridge existing document, export, employer and provider behavior deliberately.
5. Add operational setup, developer docs, tests and verification report.

## Definition of foundation completion

The foundation is code-complete when its routes and controls have real server/service actions, data access is owner-scoped, migrations and setup are reproducible, and existing functionality remains intact. This does not certify production readiness: database migration, dependency resolution/typecheck/build, live OIDC login, document fixtures, E2E isolation and deployment review must pass before release.

## Environment constraints discovered

- npm registry lookup failed with ENOTFOUND; new dependencies are not present in the existing cache.
- Docker CLI exists but its daemon is unavailable; PostgreSQL is not listening.
- Chromium startup was previously denied by the workspace sandbox.
- These are validation blockers, not permission requests. Implementation continues; blocked checks must not be labelled passed.

## Verification report — 22 October 2026

- **Passed:** existing root regression suite, 159/159 tests, including the added career-advice evidence contract regression.
- **Passed:** existing Vite production build. Its large-bundle warning remains.
- **Passed:** new foundation native unit tests, 4/4 (opaque sessions, unsafe URLs, honest profile-overlap recommendations).
- **Passed:** syntax transforms for all 62 new TypeScript/TSX modules; local imports resolve except the intentionally ungenerated Prisma client; SQL contains every schema model. These are not TypeScript type checking, Prisma validation or database execution.
- **Blocked:** dependency installation fails with `ENOTFOUND registry.npmjs.org`; no lockfile has been fabricated. Typecheck, Next build and migration commands stop at missing `prisma`; lint stops at missing `eslint`. E2E cannot execute the required Playwright Test runner (the unrelated available binary reports an unknown `test` command).
- **Blocked:** PostgreSQL and Docker daemon are unavailable. Migration execution, persistence/ownership integration tests, real OIDC callback/logout and browser workflows remain unverified. Existing data was not deleted or implicitly migrated.

## Scope delivered and next release gates

The initial foundation source includes the persistent shell, original design tokens, workspace routes, schema/migration, real OIDC and hashed sessions, owner-scoped CRUD, PDF/DOCX extraction and export, DB-backed UK search/filter/sort, employer ingestion, explicit non-destructive legacy import, evidence-based AI match/tailor and owned assistant conversations, deterministic recommendations, Compose and documentation. Imported observations retain their historical dates and cannot replace newer database observations.

Before release: install and commit the dependency lockfile; run Prisma generation and validate the SQL against generated migrations; migrate a disposable and restored database; pass new type/lint/build/E2E checks; verify real identity/provider/document integrations; complete accessibility/security/operational review. Dedicated live NHS ingestion in the new worker, semantic AI ranking, complete employer coverage, automatic private-browser-data migration, and distributed scheduling are deferred, with existing local workflows preserved.

## Product design implementation — workspace redesign

Implemented the navy/blue/mint design system, root light/dark/system theme, responsive active navigation, Saved Jobs and Settings, database-backed dashboard, split discovery, live resume preview/readiness/comparison/history, evidence review, Kanban/table tracker, resume associations and follow-up/calendar workflow. The tracker schema extension is an additive migration; prior records and routes are preserved.

Acceptance: real interactive actions, owner validation on associated resumes, no invented AI fit scores or email-reminder delivery, preserved export/provider paths, keyboard-accessible controls and mobile reflow. Eight native unit tests and 159 existing regressions pass; token contrast and browser bundle checks pass. Full lint/types/build, migrations and browser/accessibility execution remain blocked by missing dependencies/network and local service restrictions. See `docs/UI_REDESIGN.md` for the detailed screen matrix and verification limits.


## Job discovery implementation

Added modular public ATS providers with bounded transport/pagination, persisted JobSource leases/health, JobObservation provenance, additive enriched job/employer fields and JobLocation coordinates. Search uses bound PostgreSQL parameters, GIN/trigram indexes, consistent count/page transactions, relevance/date/salary ordering, bounded pagination, technology matching, postcode radius, exclusions and honest unknown-field filters. Owner-scoped SavedSearch and SavedJob records back debounced URL filters, restore, hide/unhide and collections. Existing tracker/save, detail and AI match routes remain connected.

Acceptance implementation includes canonical-link deduplication without deleting old IDs, similar-requisition warnings, conservative missing/expiry handling, last-verified timestamps only from actual collection, 429/403 handling, retry/backoff and source-health UI. Source configuration is explicit; no HiringCafe access, unlicensed feed simulation or fake live listings are added. Actual migration/provider/browsing checks remain release gates in this restricted environment. See `docs/JOB_DISCOVERY.md` for verified official API documentation, exact filter semantics, setup and test results.

Discovery verification: 28 native unit tests passed; 159 existing regressions passed. One real-PostgreSQL scenario explicitly skipped without an isolated test database. Lint/types/build/migrate stop at unavailable ESLint/Prisma; E2E cannot run the absent Playwright Test package; dependency install reports ENOTFOUND. Browser and database/source-operation claims remain unverified.

## Candidate profile and master resume module

Implemented private AES-GCM original retention, bounded PDF/DOCX worker extraction and diagnostics, source-backed structured deterministic/AI-assisted parsing, editable profile sections with uncertain-field confirmation, original downloads, multiple baselines, explicit activation, append-only version history and active-master integration. Additive schema/migration and ownership/immutability triggers preserve existing records. The compact profile API remains functional and appends correction history.

Dependencies: installed app dependencies, PostgreSQL, OIDC sessions, a private document encryption keyring; configured AI provider only for optional assistance. Acceptance: exact original byte preservation, uncertain fields block publication, no unsupported AI facts, each correction creates a revision, cross-owner access fails, stale editors receive conflicts, a newer upload never silently replaces the selected baseline. See [candidate module documentation](CANDIDATE_PROFILE.md) for architecture, configuration, limits and release gates.

Progress: implementation complete; 36 native CareerPilotAI tests and 160 existing regressions pass. Real document extraction and encryption checks execute. Isolated database and browser scenarios are implemented but remain unexecuted with full lint/types/build/migrate because app dependencies cannot be installed (npm DNS ENOTFOUND). Deployment verification remains outstanding.

## JD analysis and evidence matching engine

Implemented strict grounded JD extraction, mandatory/preferred/unspecified checklist review, confirmed-profile-only matching, configurable deterministic weighted scoring, score components/coverage, evidence links, conservative partial/unverified/blocker classification and claim-preserving tailored artifacts. Exact JD/profile/resume versions and hashes are retained with every analysis; owner-scoped history and immutable database triggers support auditability. Job discovery and detail views use the same engine. The legacy match endpoint now requires checklist review rather than silently returning a free-form assessment.

Dependencies: baseline migration and confirmed profile, new additive matching migration, configured existing AI provider for extraction only, PostgreSQL/authentication. Acceptance: every met/partial requirement has confirmed candidate evidence; unknown does not imply absence; weights/components are visible and persisted; generated versions never change baseline facts; cross-owner access fails; exact snapshots survive subsequent revisions. See [JD matching documentation](JD_MATCHING.md) for scoring formula, limits, API compatibility and setup.

Progress: working implementation and automated tests added; 46 native tests and 161 regressions pass, plus syntax/browser-bundle checks. Database/browser scenarios remain release gates; full lint/types/build/migration cannot execute with absent dependencies in this restricted environment.

## Intelligent ATS-friendly resume builder

Implemented `/resumes/builder` with actual AI proposals constrained to confirmed facts, source-linked accept/reject/edit review, live/original comparison, highlighted changes, section reorder, word targets, Classic/Compact UK templates, manual drafts, explicit whole-CV approval, full version history and restore-as-new-draft. New additive BuilderSession/BuilderVersion persistence guards source ownership, revision conflicts and immutable versions. Approved CVs create separate tailored resumes and never change originals/active masters.

Real `docx` and embedded-font jsPDF generators produce A4 single-column documents. Both DOCX/PDF must pass full text re-extraction before approval; every actual download revalidates content. Readiness reports missing sections, unverified wording/keywords, date issues, readability and length without claiming an official ATS score. See [builder architecture, boundaries and setup](RESUME_BUILDER.md).

Dependencies: confirmed baseline and persisted job match; configured existing AI provider; PostgreSQL/new migration; document/font packages. Acceptance: no invented metrics/skills or professional promotion of project facts, every generated block retains source IDs, all changes reviewed, exact original byte preservation, working valid exports, appended history, stale-write conflict and cross-owner denial.

Progress: implementation and automated tests added. 62 native tests and 162 regressions pass, including actual DOCX/PDF structure/re-extraction/multi-page checks. Four browser bundles and module syntax checks pass. Database integration scenarios explicitly skip without isolated PostgreSQL; full lint/types/build/migrations/E2E remain blocked by unavailable dependencies/npm DNS. Runtime database/browser/container/provider smoke checks remain release gates.

Builder acceptance hardening: approved text now preserves heading/role/bullet line boundaries; source extraction/transcription diagnostics are retained in UI and saved readiness reports; explicit months improve chronology; original bullet wording remains a valid reviewed edit. Four targeted regression cases added.

## Full application pipeline and career dashboard

Implemented all ten stages; owner-scoped manual/job-based creation, paginated search/filter/sort, Kanban drag/drop plus keyboard status controls, table/details, interview stages/preparation, recruiter contacts, application/follow-up dates, linked resume and private encrypted cover letters. Status transitions append immutable audit history; legacy records receive explicitly labelled current-state snapshots. Revision checks prevent stale UI edits. Similar requisitions are flagged and exact duplicate save actions preserve stage/date.

Dashboard counts/conversions use actual records with explicit denominators, zero-denominator unknown states, recorded outcomes retained across terminal stages and no inferred earlier interactions. Added follow-ups, recent resumes, disclosed relevant-job overlap and latest-per-job common evidence gaps. Approved/generated resume screens now provide a real save-job/Preparing action tied to the exact analysis/resume; pasted JDs request actual employer details through a prefilled manual form.

Dependencies: additive application-pipeline migration, generated Prisma/PostgreSQL/authentication; private document encryption for optional attachments. Acceptance: refresh persistence, owner isolation, genuine status history, no employer-link submission, duplicate preservation, real metrics and linked tailored artifacts. See [tracker/dashboard setup and definitions](APPLICATION_TRACKER.md).

Progress: 69 native tests and 162 regressions pass; syntax and four browser bundles pass. Database/browser scenarios are implemented but unexecuted; five integration scenarios skip without isolated PostgreSQL. Full lint/type/build/migration/E2E remain blocked by missing toolchain dependencies in this environment.

Tracker acceptance hardening: employer/role/location/URL corrections persist with identity collision checks; bookmark saves share tracker deduplication within the same transaction; unsaving never hides preparing/progressed applications. Added archive visibility and explicit restore for historical hidden records. Expanded database scenarios for corrections, stage/date preservation, duplicate bookmark saves and archive recovery; native suite now has 69 passing tests.


## Integration, security and release review — 23 October 2026

Release status: **NO-GO**. Audit completed at the source/native-test level; integrated runtime acceptance remains blocked. See [findings and journey matrix](RELEASE_AUDIT.md), [actual test results](TEST_REPORT.md) and [setup/production runbook](PRODUCTION_RUNBOOK.md).

Implemented targeted corrections: employment grouping across DOCX paragraph gaps; conservative ambiguous-title handling; private response/cache and HTTPS OIDC cookie controls; CLI child secret filtering; hostile UTF-16 XML rejection and parser-log containment; validated runtime origins; tracker record deep links and owned detail lookup; reduced worker/build context secrets. These changes address documented failures/security boundaries without redesigning working features.

Added continuous Playwright journey with explicitly isolated signed OIDC/AI fixtures, real handlers/database/document generation assertions, logout/return and malformed-provider cases. Required database/journey runners fail closed; reviewed-lockfile CI and image gates prevent accidental release with skipped tests or nondeterministic dependencies. Dependencies: installed/locked app packages, generated Prisma, dedicated PostgreSQL, browser binaries, real staging identity/AI/source configuration.

Acceptance: all fifteen journey steps demonstrated on staging; migrations on empty/restored databases; ownership and immutable-version scenarios pass; valid re-extracted downloads and preserved originals; no unsupported AI claims; accessibility/mobile review; clean dependency/security review and operational isolation. Progress: **82 native app tests and 163 existing regressions passed**. Five database scenarios skipped; lint/types/build/migrate/E2E and audits blocked by missing dependencies/services/network. None of those gates is marked complete. No live provider connectivity or production readiness claimed.


## Local file-backed authentication alternative

Added explicit local-only `AUTH_MODE=file`: first-account form, salted scrypt passwords, private atomic file persistence, hashed expiring/revocable sessions, origin validation and persisted attempt limits. No default credentials or database/authentication bypass. OIDC remains unchanged in default mode and is blocked while file mode is selected. App-local environment now selects file mode; account creation remains the user's action.

Dependencies: Node filesystem/crypto and installed Next dependencies; no PostgreSQL/IdP required for local account operations. Acceptance: create first account once, reject wrong passwords, survive new store instances/reload, reject symlink/corrupt/permissive files, expire/revoke tokens, production/remote rejection, display honest database-dependent feature limits. Native storage/security scenarios execute; dedicated Playwright flow added but not executed. The career workspace intentionally redirects file users to the account page because its persistence remains PostgreSQL-backed. See [local auth documentation](LOCAL_AUTH.md).

Local auth follow-up verification: 88 native tests pass; lint passes. Dependencies and a lockfile are now present. Type/build are blocked by Prisma engine download DNS, and browser/dev startup by localhost listen EPERM. File-backed auth unit tests execute without PostgreSQL; browser acceptance remains outstanding.


## Explicit database-free guest workspace

Exposed the existing local workflow through Continue as guest and `guest:dev`; added an original guest dashboard, scoped persistent browser keys, typed draft recovery, export/clear actions and safe local-only entry links. Kept authenticated Next/database routes intact. This reuses existing document/AI/job/export integrations; it does not implement a simulated Prisma backend. Newer database-only profile/evidence/chat and advanced tracker features are explicitly disclosed as unavailable in guest mode.

Dependencies: root packages/local backend, browser storage, configured provider for AI and reachable actual feeds for fresh listings. Acceptance: no account/PG required for the local workflow, existing private data preserved, guest records survive reload, source/provider errors remain visible, valid existing exports and no implied application submission. Native results: 167 root and 89 app tests pass; Vite production build and Next lint pass. Guest browser suite added but blocked by local socket EPERM; full Next type/build gates remain outstanding. See [guest setup and precise scope](GUEST_MODE.md).


## Landing sign-in and registration pop-ups

Implemented shared accessible native dialogs on the landing page. Sign-in has email/password only; a separate Create account button opens registration with name/email/password/confirmation. Existing `/login` links redirect to a deep-linked landing sign-in dialog; OIDC callbacks and provider handoff remain connected. Local registration now permits distinct accounts with atomic case-insensitive duplicate rejection, a bounded account count and shared persisted attempt limits; existing accounts/sessions are preserved. JSON submission reports actual backend outcomes and sets real session cookies.

Acceptance: distinct forms, real account creation/login, duplicate/invalid credentials visible, modal focus/Escape behavior, no password in URLs and independent sessions. 91 native app tests and lint pass; isolated dialog/UI-dependency TypeScript and browser-bundle checks pass. Updated local browser journey is implemented but blocked by sandbox listen EPERM. No full application type/build or rendered browser verification claimed.


## Guest entry integration fix

Confirmed failure: the landing button linked to a separate 5173 server while only Next/CareerPilotAI was running. Replaced that dependency with a bundled same-origin `/guest` route and allowlisted in-process `/api/guest/*` handlers. Automatic predev/prebuild guest bundling, standalone asset copying, same-origin HTTP adapter and an actual landing-click browser regression were added. Existing standalone behavior and authentication remain intact. Embedded guest refresh is explicitly manual; provider failures remain real.

Acceptance: one server, real guest HTML/assets/APIs without PostgreSQL/login, no forwarding of private account endpoints, correct origin checks, preserved browser data and no dependency on obsolete URL configuration. Latest native counts are 172 root and 91 app passes; bundle/lint/isolated route types pass. Full browser verification remains subject to sandbox socket restrictions. The first root rerun exposed five harness-import failures; corrected the harness to load the real adapter, then all assertions passed. See updated GUEST_MODE.md.


## Theme consistency integration

Corrected the remaining guest/account visual mismatch using shared `src/theme-tokens.css` and `src/theme.js`. All local workspace screens and Next pages now share appearance persistence, light/dark/system palettes, system typography and consistent cards/controls/navigation colours. Added the guest/local header selector and rebuilt guest assets. Kept white document previews and existing data/auth/AI/document logic intact.

Acceptance: one appearance preference across same-origin pages/tabs; system media updates; readable themed controls and feedback; consistent responsive shell; no document-content changes. Native results: 175 root and 91 app passes; lint/focused TypeScript, Next CSS compilation and Vite bundles pass. Browser comparison/mobile test added but remains blocked by localhost listen restrictions. See UI_REDESIGN.md for the documented reason and scope.


## Guest search compilation/response integration

Confirmed and fixed HTML search failures caused by the standalone entry import and bundler treatment of runtime catalogue URLs. Added a server API module boundary, explicit guest filesystem paths, runtime file tracing exclusions, validated search envelopes and a real retry action. Existing catalogue/configuration/data remain intact; no fake listings added.

Acceptance: Next can compile the actual guest route without PostgreSQL/sockets; keyword results pass the handler→bridge→UI contract; HTML failures remain sanitized and recover through Retry; standalone startup still works through the shared handler. 180 root and 91 app tests pass; guest bundle, focused TypeScript and isolated Next/Turbopack route compile pass. Full application/browser/live-source gates remain separate. See `test:guest:compile` and TEST_REPORT.md.


## Authenticated profile and account controls

Added shared Profile icon and Account disclosure to the authenticated workspace header and local-account page. Profile opens the existing candidate profile in OIDC mode and actual account-profile details in local mode; Account settings opens the real account/security section. The disclosure displays the authenticated name/email and retains the actual sign-out form, with Escape, outside-pointer and focus-leave dismissal. Local profile/account anchors avoid database-dependent redirects. Guest/static entry does not mount the controls, including when a session cookie is present. No authentication/storage policy changed.

Verification: lint, focused component/test TypeScript and browser bundling/page syntax checks pass. Updated browser scenarios assert visible account controls after real registration, Escape dismissal, hidden guest controls and the moved workspace sign-out action. Browser assertions remain unexecuted under the known local-port restrictions.


## Local registration dependency and browser-error fix

Confirmed from server diagnostics: local registration imported universal session code and therefore the missing generated Prisma client. Separated shared cookie policy and file-only session/page/logout operations; retained the existing OIDC/Prisma session behavior. Local account creation and its destination no longer require Prisma/PostgreSQL. Added schema/shape validation of auth responses, sanitized browser/HTML errors and a compatible request timeout. Account menu and local sign-out forms use the real file-only logout endpoint.

Acceptance: actual create/login cookie/session round trip with no DB, special characters preserved, duplicates/incorrect credentials/confirmation/origin failures rejected, authenticated destination compiles without ORM generation, no private account files copied into build assets. 94 native app tests pass; actual handler+Next cookie+client parser test and isolated auth Next/Turbopack compilation pass. Lint/focused types pass. Local browser journey remains blocked by port EPERM; no rendered journey claimed. Reusable compiler fixture setup now serves both guest and auth regression checks.


## Local registration Origin compatibility

Replaced strict localhost-name equality with a shared, constrained development-file-mode policy: loopback aliases only, same configured protocol/port, matching browser request authority and no cross-site/forwarded-host bypass. Production and OIDC remain exact-origin. Local signup/error/logout redirects retain the browser origin; guest bridge uses the same checks. Existing account/session records are unchanged.

Acceptance: actual IP-based registration produces a usable session; native redirects and logout stay on that host; foreign/missing/null/cross-site/wrong-port/scheme requests fail; production aliases remain rejected. 185 root and 94 app native tests pass, real local handler/cookie checks pass, with lint/focused types and isolated Next compilation. Browser regressions added; full rendered verification remains blocked by listening-port policy.


## Local account workspace shell alignment

Replaced `/local-account`'s bespoke narrow page/header/footer with shared AppShell, PageHeading and responsive profile/security/appearance/workspace cards. Added local-mode destinations to the same navigation component, preserving functional profile/account anchors, local logout, guest entry and setup. Database-only links are not presented as available local functions. Hash selection and mobile menu behavior match actual navigation. Auth/data/session behavior is unchanged.

Acceptance: consistent sidebar/header/footer/theme and spacing, authenticated account details, correct local destinations, responsive cards and no PostgreSQL import requirement. Lint, focused TypeScript, shared CSS compilation and isolated Next auth/account compilation pass. Desktop/mobile browser checks are updated; rendered verification remains limited by the known local-port restriction. See UI_REDESIGN.md.


## Account controls: screenshot integration correction

The actual screenshot showed missing avatar formatting and a vertical native-details control. Moved avatar/account styling into component CSS dependencies; replaced details with an explicit accessible disclosure button, kept 44px aligned controls and the mint identity avatar, and widened appearance text space. Existing profile/account/logout actions and guest hiding are preserved. Added computed-style/bounding-box regression assertions.

Lint, focused types, component stylesheet/bundle checks and isolated Next Webpack account compilation pass. Turbopack's CSS-worker port and browser binary download are blocked (EPERM / DNS); no visual browser pass claimed. Shared guest theme bundle rebuilt. See UI_REDESIGN.md and TEST_REPORT.md for exact verification.


## Authenticated audience separation

Removed guest navigation/promotions/data messaging from authenticated local account screens. Public landing renders actual account controls and hides visitor entry when a valid file/OIDC session is present. Guest page/API guards reject active sessions; a beforeFiles rewrite guards the old public HTML entry. Stale built-in anonymous tabs and landing pages revalidate on focus/session notifications. Notifications contain no identity or credentials and cannot establish authentication. File account data and existing anonymous records remain separate and unchanged. Local accounts retain honest database-setup guidance rather than renamed anonymous features.

Verification: 187 root and 94 app tests pass, including safe redirect handling; actual local registration/cookie checks also verify active/revoked public account lookup. Lint, focused types, guest bundle and isolated Next Webpack landing/account compilation pass. Added PostgreSQL owner/expiry/revocation lookup integration coverage and real-browser no-guest-after-login, direct entry/API denial, landing controls and logout restoration assertions. Database/browser execution remains subject to the existing external prerequisites; no skipped checks count as passes.


## Account-only page content

Simplified Your Account to profile details, appearance and account/security actions. Removed the career-workspace/setup card, local setup navigation and sidebar promotion. Local sidebar sections now describe only the account; the shared shell and the full application's navigation are preserved. Appearance/security stack beside the profile on desktop and below it on smaller screens. Sign-out remains a real account action. No data/authentication changes. Lint, focused TypeScript and isolated Webpack compilation validate the change; browser checks retain their existing environment limitations.


Account page simplification: removed Appearance and Account & security cards and their local sidebar anchors. The page now contains profile details only. Header appearance selection remains available, and sign-out stays in the account menu; its Account settings destination now points to the existing account page. Updated browser journey selectors for menu-based sign-out. Lint and focused TypeScript pass.

### Local account profile editing — 23 October 2026
- Completed: profile-only account card supports Edit profile, Save and Cancel for full name and sign-in email; successful changes refresh account identity.
- Server validates bounded, strict input, origin and active session ownership. Email changes require the current password; duplicate emails and stale concurrent edits are rejected. Atomic file persistence preserves account identity, password credentials and sessions.
- Acceptance verified: all 97 application unit tests pass, including persistence, duplicate email, password confirmation, revoked/expired sessions and concurrent edits. Focused local-auth TypeScript, ESLint and isolated Webpack route compilation pass.
- Added browser coverage for cancel, save, reload and sign-in with changed email; browser execution remains blocked by the documented local port/browser restrictions.

### Expanded personal and resume profile — 23 October 2026
- Completed: redesigned the local profile card using shared cards, controls, theme tokens, responsive columns and separated contact/career sections. The account page still contains only profile content.
- Added optional phone, location, professional headline, LinkedIn, portfolio/GitHub, summary, skills, employment history, education, certifications and languages. No demographic or sensitive identity fields requested.
- Strict shared validation, bounded requests and atomic account-owned storage retain existing accounts and uploaded baselines. Full career snapshots participate in stale-edit detection. Ordinary authentication lookups do not expose career details.
- Added a working plain-text resume draft download containing only supplied fields. This is a starter document, not an AI-tailored resume or a replacement for master resume versions. PostgreSQL/OIDC profiles remain separate.
- Verification: 99 application unit tests pass, focused local-auth TypeScript and ESLint pass; actual local-account/profile API routes compile with isolated Webpack checks. Extended Playwright coverage for contact/career persistence, mobile overflow and download; execution blocked at server startup (EPERM on port 3102).

### Resume upload into local account profile — 23 October 2026
- Completed: PDF/DOCX picker, upload/extraction status, error handling, extracted-text preview, per-field opt-in selection, confirmation and explicit Save changes workflow. Imported values update an editable draft; existing unselected fields and sign-in email remain unchanged.
- Added authenticated, origin-protected `/api/account/profile/import` with bounded multipart parsing, 5 MB limit and existing worker-isolated document validation/extraction. No database is required for local profile import.
- Extraction is deterministic, using source text and recognised section headings; uncertain or missing details are never invented. Scans without text require manual entry. Uploads are temporary and are not retained as baseline documents; UI states this explicitly.
- Validation: 102 unit tests pass including real PDF/DOCX import and source-byte preservation; ESLint, focused TypeScript and isolated Webpack route compilation pass. Added Playwright selection/confirmation/save/reload coverage; browser execution remains blocked by the documented local server port restriction.

### Bundled document extraction fix — 23 October 2026
- Fixed Turbopack rewriting static parser dependency paths into numeric IDs. Runtime resolution supports both DOCX and PDF workers.
- Added isolated compiled-handler regression coverage (`test:extraction:runtime`) and confirmed genuine DOCX/PDF extraction under Turbopack and Webpack, alongside 102 passing unit tests.
- Improved DOCX failures to distinguish unavailable reader dependencies from unreadable document content, without relaxing safe file processing.

### Career role details — 23 October 2026
- Added optional Role Description and Role Responsibilities or Duties fields; renamed the existing skills label to Technical Skills while retaining stored skills data.
- Connected new fields to strict validation, atomic local profile persistence, resume import review, and resume draft export. Older profiles default new fields to empty; existing career sections remain available.
- Extended existing persistence/export and source-backed import tests for the added fields.

### Resume import review UI refinement — 23 October 2026
- Replaced the flat import list with a shared review component and scoped styles using application colour, border and spacing tokens.
- Grouped contact and career details in responsive selection cards, added selected counts, Select all/Clear selection and expandable long-content previews; made extraction notes and source text collapsible.
- Kept native labelled checkboxes, visible keyboard focus, explicit confirmation, safe empty state and draft-only import. Selection changes reset confirmation to ensure newly selected fields are reviewed.
- Extended Playwright flow for bulk selection, clearing and confirmation reset. Browser execution remains blocked by the documented local server restrictions.

### Six resume categories and structured roles — 23 October 2026
- Limited local resume import proposals to Professional Summary, Technical Skills, Professional Experience, Certificates, Achievements and Education. Personal/contact details and standalone role-description/duty fields are no longer import options.
- Professional Experience now persists as a validated array (up to 30 roles) with job title, employer, dates, description, responsibilities, achievements and original source text. The import review displays distinct role entries; the profile editor supports adding, editing and removing roles before explicit save.
- Added Achievements and compatible defaults for existing profiles. Old free-text experience remains intact until the user saves its editable role representation. Original role text is retained; uncertain employer/title associations are left unassigned for review.
- Added multi-role grouping, backward compatibility, six-category selection, export, persistence and stale-array-edit tests. Updated Playwright selectors and workflow for structured roles. Browser execution remains unverified due to the documented server restrictions.

### SDET resume role segregation fix — 23 October 2026
- Found SDET/QA abbreviations missing from title detection and role boundaries incorrectly relying on dates in the preceding role. Added SDET/QAE/QA title recognition and independent role boundaries.
- Added employer-first layouts, labelled job titles/designations, pipe headers in different orders, numeric date ranges, and role-level description/duty grouping. Responsibility sentences mentioning job titles are excluded from header detection; original role source remains preserved.
- Expanded recognised employment section names (career history, work history, employment details, professional background).
- Verified 111 passing unit tests including actual PDF/DOCX extraction of multiple SDET roles and C# duties. Lint and focused TypeScript pass.
- User-named `NagaSai_SDET_Resume_C#` was not found in the workspace or attached to the conversation, so its exact extraction is still unverified. Original file or extracted employment text is required for that check.

### Personal/contact resume extraction restored — 23 October 2026
- Restored personal/contact extraction in a separate `contactProposals` collection, keeping the six career import categories unchanged.
- Added reviewable full name, phone, explicit address/location/headline and professional URLs. Detected email is informational; importing never changes sign-in email. Unknown fields remain absent, and all selected contact values require the existing confirmation and explicit profile save.
- Added tests for source evidence, missing/ambiguous fields, date-vs-phone safety and genuine PDF/DOCX contact extraction. All 114 unit tests pass; focused TypeScript and ESLint pass.

### Profile save reliability fix — 23 October 2026
- Replaced field-order-dependent JSON snapshot comparisons with schema-normalized structural equality. Genuine concurrent changes still return a conflict; reordered object keys do not.
- Shared profile mutation schema now validates before submitting. Domain-only professional links are normalized to HTTPS; unsafe schemes remain rejected. Removed browser-only form validation that could stop the submit handler without application feedback.
- Invalid input now produces a labelled error, with focus and scroll to the message. Cancel clears import notices along with the draft.
- Added `test:profile:save`, invoking the real profile PATCH handler with Next request/cookie context and isolated local accounts. Verified imported address/SDET roles persist, bare links normalize, and invalid/stale/unauthenticated/cross-origin requests fail safely.
- Verification: 116 unit tests, real-handler persistence smoke, ESLint and focused TypeScript pass. User's current account was not inspected or mutated; browser E2E remains blocked by the documented local port restriction.

### Saved-profile resume PDF download — 23 October 2026
- Replaced plain-text draft download with an authenticated saved-profile PDF endpoint and Download resume PDF control, including preparation state and visible error feedback.
- Uses the existing classic UK A4 single-column document renderer with embedded fonts, standard section headings and separate roles. Certificates precede Achievements. Empty sections are omitted; no claims are added.
- Every PDF is re-extracted and compared to source text before returning. Download reads only the session owner's saved profile; uploaded originals and profile storage are unchanged.
- Fixed PDF font dependency resolution for Turbopack using the runtime resolver pattern. Added compiled runtime generation checks and a real-handler PDF/authentication/immutability smoke check.
- Verified 117 passing unit tests, real save/download handler checks, compiled Turbopack PDF generation plus re-extraction, ESLint and focused TypeScript. Browser E2E download expectation updated to PDF but remains unexecuted due to documented environment restrictions.

### Tools & Technologies — 23 October 2026
- Added a separate optional Tools & Technologies field to the profile, import review, validation, persistence and PDF export. Existing profiles default to empty; Technical Skills data is retained separately.
- Import recognises Tools & Technologies, Tools and Technologies, Tools/Technologies, Tools and Technologies headings. PDF renders the section with a standard heading and omits it when empty.
- Verified 119 passing unit tests, including distinct section extraction, backward compatibility, length limits and PDF text preservation. Lint, focused TypeScript, actual profile-save and authenticated PDF-download smoke checks pass.

### Profile resume display — 23 October 2026
- Added an inline Resume preview to the saved profile alongside the existing contact/career sections. The viewer fetches the authenticated, text-validated PDF already used by download and refreshes when saved profile data changes.
- Includes preparation skeleton/status, timeout/error handling, retry, Open PDF fallback for mobile/unsupported inline viewers, and object URL/abort cleanup. Uploaded originals and unsaved edits are not represented as the saved CV.
- Added Playwright assertions for preview heading, valid PDF object and Open PDF link. Browser execution remains unverified because of the documented local port restrictions.

### Resume whitespace cleanup on save — 23 October 2026
- Added shared client/server cleanup for editable profile and role fields: trims line edges, collapses repeated horizontal whitespace, standardizes line endings and removes excess blank lines. Names/job titles/employers/dates are normalized to single lines.
- Preserves paragraph breaks, bullet text, role separation and original source evidence. Applies on explicit save; existing original uploads are unchanged.
- Verified 121 unit tests, focused TypeScript, lint and actual profile-save/PDF handler smoke checks. The real save handler now verifies normalization of repeated spaces in the submitted summary.

### Visible spacing cleanup — 23 October 2026
- Added Clean spacing inside Edit profile so users can inspect cleaned text before saving. Career text fields also normalize on blur; saved-profile sections apply the same validated cleanup when displayed.
- Successful saves update the local editor values and visibly confirm whitespace cleanup. Original role-source text is preserved.
- Added pure editor-cleanup regression coverage and Playwright assertions for the Clean spacing action. All 122 unit tests, focused TypeScript and lint pass. Browser visual verification remains unavailable in this environment.

### Account page spacing refinement — 23 October 2026
- Tightened profile card padding, section spacing, form gaps and text line height on `/local-account`.
- Displayed contact/career/role values now explicitly trim and collapse extra spaces, including legacy values when whole-profile validation cannot normalize them. Read-only text uses pre-line rendering to avoid preserving horizontal/trailing whitespace.
- Added field-blur cleanup to personal/contact and individual role inputs; original role-source data remains stored unchanged while its displayed copy is tidied. Existing save cleanup remains active.
- Lint and focused TypeScript pass; isolated route compilation verifies the updated UI. Visual browser confirmation remains unavailable in this environment.

### Sectioned profile editor — 23 October 2026
- Organized Edit profile into reusable themed disclosure panels for Import from resume, Personal & contact details, Professional Summary, Technical Skills, Tools & Technologies, Professional Experience, Certificates, Achievements and Education.
- Contact details open initially; each other section expands independently. Expand all / Collapse all operate on editor panels and retain draft values. One Save changes persists the complete draft with existing ownership and validation rules.
- Validation opens the affected panel, and applying import details opens contact details before focusing. Updated Playwright flows for panel expansion and draft preservation while toggling; browser execution remains unverified in the restricted environment.

### Direct career-section Edit actions — 23 October 2026
- Added an Edit button to each saved Career & resume details section: Professional Summary, Technical Skills, Tools & Technologies, Certificates, Achievements, Education and Professional Experience.
- Each action opens the shared editor with only the selected panel expanded and focuses its field. Professional Experience focuses an existing role or Add role when empty. Empty experience remains visible with its Edit action.
- Shared Save changes and Cancel retain existing validation, snapshot conflict protection and persistence behaviour. Updated Playwright coverage for all section Edit actions and selected-panel navigation; browser execution remains unverified in this environment.

### Grouped Tools & Technologies — 23 October 2026
- Added repeatable heading/body groups with Add heading and Remove actions, server/client schema validation, whitespace cleanup and persistent local account storage (up to 30 groups, bounded content).
- Saved profile and import preview render heading/body groups as a three-column table with bullet bodies. On smaller screens, the table is horizontally scrollable and keyboard focusable. Technical Skills and Certificates keep their existing layouts.
- Legacy tools text is converted into editable groups without inventing category labels. Imported tools text recognises explicit `Heading: body` or `Heading:` plus body lines. New imports replace the selected tools section only after confirmation, then explicit Save changes.
- PDF export renders group headings and bullet bodies in the existing ATS-friendly single-column document rather than copying the UI table. Existing original documents remain unchanged.
- Verification: 125 unit tests pass; actual profile-save and authenticated PDF smoke checks persist grouped data and preserve exported text; lint, focused TypeScript, isolated Webpack compilation and server-rendered three-column table checks pass. Playwright flow updated for adding three groups and checking table cells; browser execution remains unverified.

### Tools & Technologies visual consistency — 23 October 2026
- Applied scoped application-token styling to saved/imported tools tables and the repeatable editor: category cards, muted heading bands, consistent type sizes, compact spacing and shared borders/radii.
- Retained three table columns, bullet bodies, functional Add/Remove controls, keyboard scrolling and existing persistence/export behaviour. Empty table slots no longer draw spreadsheet boxes.
- Lint, focused TypeScript and isolated Webpack route compilation validate the update; browser appearance remains unverified in the restricted environment.

### Structured Education — 23 October 2026
- Education now supports repeatable entries with Main stream / qualification, College / university name, optional dates/details and retained original source text. Add/Remove controls edit the draft; Save changes persists entries.
- Profile and import preview show qualification as the heading with institution beneath it. PDF export uses the same field order. Existing free-text education is converted into editable entries when editing, preserving source content and leaving unidentified institutions blank.
- Added entry limits, whitespace handling and compatibility defaults. New resume imports replace education entries only after selection and confirmation.
- Verification: 128 unit tests pass, including education grouping, unknown facts, source preservation, legacy defaults and real PDF re-extraction. Actual profile-save/PDF smoke checks verify persisted institution and qualification content. Lint, focused TypeScript and isolated Webpack checks pass; browser appearance remains unverified.

### Modern local-account presentation — 23 October 2026
- At the user's request, replaced the single long profile panel with a themed profile header, responsive contact/career layout, individual career cards and a separate document-preview card. Retained full available content width and compact spacing.
- Desktop uses a contact-details column alongside career content; tablet/mobile stack naturally. Theme colours, borders, icons and focus states use existing shared tokens/components. Experience uses a simple timeline presentation; education, tools tables, paragraph summary and three-column skill bullets retain their data/behaviour.
- Kept all section Edit actions, collapsible editor panels, explicit save/cancel, import confirmation, cleanup, profile ownership and validated PDF download. Editor actions stay visible in a sticky action bar.
- Verification: focused TypeScript, ESLint, isolated Webpack compilation and actual save/PDF smoke checks pass. Attempted Playwright; web server startup is blocked by `listen EPERM 127.0.0.1:3102`. Browser screenshots, computed responsiveness and visual accessibility remain unverified here.

### Account workspace direction revision — 23 October 2026
- User was unconvinced by the card/sidebar restyle. Revised the information layout instead: compact header with persistent Edit/Download actions, keyboard-accessible Profile details / Resume preview tabs, full-width contact grid and flatter career sections separated by rules.
- Removed redundant visible page-heading content and nested career boxes; retained an accessible page heading, all requested section ordering, section editing, structured tools/education, bullets and whitespace cleanup.
- Resume PDF loads only when its tab is selected. Tabs support ArrowLeft/ArrowRight/Home/End and proper selected/tab-panel relationships. Edit always opens the profile editor, preserving existing explicit save/cancel behaviour.
- Lint, focused TypeScript and isolated Webpack compilation pass. Playwright flow includes tab selection/keyboard navigation; execution and screenshots remain unavailable due to the documented test-server restrictions.

### Executive resume style from user reference — 23 October 2026
- Reviewed the user's Etsy listing (1381928964). The listing was accessible via its non-UK URL, but full-size product images were unavailable. Used its general minimalist executive direction for an original implementation; no commercial template files or assets were downloaded or embedded.
- Added executive-uk document styling: navy identity/contact header, clear section dividers, restrained typography, bold role/education/tool group headings and compact body spacing. Kept A4, a single searchable column, safe pagination and full source-text re-extraction validation.
- Account preview/download now use executive-uk. Existing classic/compact builder modes remain available and unchanged. Structured role, education and grouped-tools data still come solely from saved user facts.
- Verified 130 passing unit tests including executive PDF/DOCX validity and long-CV pagination/content preservation, actual authenticated profile PDF smoke, lint, focused TypeScript and compiled Turbopack PDF-generation checks.
- Generated validation/careerpilot-executive-preview.pdf from the existing fictional test fixture as an explicitly illustrative design sample. Rendered and inspected its first page using PDF.js/canvas; no real user documents were read or modified.

### Two-column Technical Skills in resume PDF — 23 October 2026
- Technical skills are converted to individual bullet items in the saved-profile resume source. Executive PDF renders these in two equal-width columns, row by row, with wrapped text and page-break handling.
- Other resume sections retain their existing layout. The profile's three-column skills UI is unchanged. Classic/compact and DOCX exports retain normal bullet lists.
- Verified 132 unit tests including PDF text geometry (two distinct x positions on the same row), odd item counts, wrapped skills and exact text preservation. Lint, focused TypeScript and authenticated save/PDF smoke checks pass.
- Updated and visually inspected the illustrative executive sample PDF with the new skill columns.

### Professional Experience PDF bullets — 23 October 2026
- Export now formats each structured role's description, duties and achievements as individual bullets while retaining job title, employer and dates as role headings/metadata.
- Normalizes existing list markers to avoid double bullets. Executive PDFs draw round bullet markers with hanging text indentation; wrapping/page breaks preserve searchable text.
- Verified 133 unit tests, actual profile save/PDF smoke checks, focused TypeScript and lint. Initial lint overlapped cleanup of a temporary smoke-test directory and failed with ENOENT; rerun after cleanup passed. Updated the illustrative PDF sample.

### Two-column Tools & Technologies PDF — 23 October 2026
- Executive resume PDFs now place tools groups in two columns, retaining each heading with its bullet body. Unequal/odd groups, wrapping and page breaks preserve text order; oversized groups fail rather than clip content.
- Legacy tools strings are normalized into heading/bullet text for export. The application's three-column tools table is unchanged.
- Verified 135 unit tests, including PDF.js column-position and heading/body assertions, legacy tools export and source-text preservation. Updated an older test that expected comma-joined tools to instead verify the separately rendered items. Actual profile-save/PDF smoke checks, lint and focused TypeScript pass.
- Updated the illustrative sample PDF and rendered/visually inspected its first page with the two-column tools section.

### Tools PDF gap correction — 23 October 2026
- Replaced paired-row height allocation with independent two-column packing, so short tools groups no longer inherit blank space from a taller neighbouring group.
- Reduced the gap below the section title and tightened heading/bullet spacing; kept consistent column/bullet alignment and safe page breaks. No source text is dropped.
- Eight focused PDF layout/export tests pass, including geometry assertions for unequal-height groups and exact text re-extraction; lint passes. Updated the illustrative PDF sample.

### Resume preview viewer and tab actions — 23 October 2026
- Replaced native PDF object embedding with an in-app PDF.js canvas viewer: all pages render at available width, use capped device-pixel scaling, and sit in a responsive scroll container. Readable per-page text is available for accessibility/copying; Open PDF/download still return the genuine searchable PDF.
- Added same-origin, version-addressed worker delivery through `/api/pdf-worker`, independent of external CDNs or browser PDF plugins. Worker source is a fixed installed dependency, not user-controlled content.
- Added real loading/error/retry states plus document/render-task/observer cleanup. Edit profile now appears only on the Profile details tab.
- Focused TypeScript, ESLint, isolated Webpack app compilation and compiled Turbopack worker/PDF runtime checks pass. Updated Playwright expectations for rendered canvas pages and the hidden Edit profile action. Browser execution remains blocked by the documented local-server environment restriction.

### PDF contact and professional links — 23 October 2026
- PDF header now includes email, phone, town/country, LinkedIn and Git profile URL, plus existing address/portfolio values where supplied. Street address no longer suppresses town/country or legacy location.
- Added optional Town / city, Country and GitHub / Git profile URL fields to Personal & contact details, persistence and import review. Imports recognise explicitly labelled town/country and distinguish Git URLs from portfolio URLs. Unknown places are never inferred.
- Preserved legacy location and Git-host portfolio export, avoiding duplicate links. Email/professional URLs have PDF link annotations; long wrapped URL prefixes point to the complete saved URL.
- Verification: 138 unit tests pass, including header content, clickable link annotations, old-profile defaults, import fields and duplicate prevention. Actual save/PDF smoke verifies persisted town/Git and extracted phone/location/links. Lint and focused TypeScript pass. Regenerated the illustrative PDF with example professional links.

### Supplied image reference layout — 23 October 2026
- Inspected the user-provided `/Users/sasidhar/Desktop/resume.jpg` without modifying it. Implemented an original navy/gold PDF layout following its structure: centred name/title banner, left contact/education/certificates/achievements column, vertical rule, and wider summary/skills/experience/tools column.
- Preserved requested two-column Technical Skills and Tools & Technologies within the main column, paragraph summary and experience/certificate bullets. Kept complete clickable email/Git/LinkedIn targets while simplifying visible URL prefixes. No source images or commercial template assets are embedded.
- Added generated-document validation by header/sidebar/main-column text, preserving character order within each column while allowing wrapping whitespace. Long columns paginate independently; long professional titles wrap instead of clipping. Existing classic/compact/executive builder exports remain available; local-account preview/download now use the reference-style renderer.
- Verified 142 unit tests, actual authenticated save/PDF smoke, focused TypeScript, ESLint and compiled Turbopack reference-PDF/worker checks. Tests include column geometry, link targets, profile immutability, long sidebar/main pagination and long headings.
- Regenerated validation/careerpilot-reference-layout-preview.pdf with explicitly illustrative fixture content; rendered and inspected its first page. Real browser viewing remains subject to the documented environment restriction.
