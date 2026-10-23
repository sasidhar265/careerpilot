# CareerPilot AI foundation

An independent Next.js App Router application beside the existing Resume Studio. Root `npm run dev`, the original AI providers, browser history, `.data` catalogue, uploads and exports remain available. The new app uses its own PostgreSQL database and port 3100. It is not an automatic in-place conversion or a claim that all production release checks have passed.

## Install and run

From this repository root:

```sh
npm install
npm --prefix apps/careerpilot install
cp apps/careerpilot/.env.example apps/careerpilot/.env
```

Set a real `DATABASE_URL`. Start PostgreSQL 17 locally or with Compose. Generate a random `AUTH_SECRET` with `openssl rand -base64 48`; never commit it. Register an OpenID Connect client with an HTTPS issuer, `openid profile email` scopes, PKCE support, client-secret-post token authentication, and the exact callback `http://localhost:3100/api/auth/callback` for local development (your HTTPS application origin in production). Configure `AUTH_ISSUER`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET` and `APP_URL` in the new app's environment. The root `.env` is not modified or copied automatically.

```sh
npm --prefix apps/careerpilot run db:generate
npm --prefix apps/careerpilot run db:migrate
npm run careerpilot:dev
```

Open http://localhost:3100. Without identity-provider configuration `/login` shows setup requirements; there is no demo login, guest mutation mode or production authentication bypass. Database access remains server-side. Pages that need private data call the session/ownership services in addition to the authenticated layout.

Dependencies could not be downloaded in the implementation environment. A new-app lockfile cannot be fabricated: the first successful install must generate and commit `apps/careerpilot/package-lock.json`, then use `npm ci` for reproducible deployment. Dependency audit, Prisma generation/migration, typecheck, lint, Next build, real login and E2E tests are release gates.

## Architecture

- `src/app`: App Router pages and API route handlers; private pages live under `(workspace)`.
- `src/components/ui`: owned shadcn-style source components using Radix Slot, CVA, Tailwind and design tokens; `components.json` permits adding further shadcn components.
- `src/server/auth`: standards-based OIDC through `openid-client` (secure authentication equivalent to the Auth.js option), encrypted ten-minute login state, PKCE/state/nonce validation, opaque hashed eight-hour database sessions, server-side logout.
- `src/server/services.ts`: session-owned profile, resume and tracker operations. Request schemas reject owner fields. Foreign private IDs return 404.
- `src/server/jobs`: source normalization/ingestion into PostgreSQL, database-backed search, repeatable legacy catalogue import. The existing Greenhouse/Lever/Ashby/SmartRecruiters adapters are reused through typed server-only bridges.
- `src/server/documents`: PDF/DOCX text extraction, actual file signatures, bounded request bodies, 20 MB files, 100 PDF pages, 32 MB expanded DOCX and 500 archive entries. New original files are retained privately as immutable AES-GCM ciphertext alongside extracted text, hashes and diagnostics; a document keyring is required. Legacy text-only uploads cannot recover discarded originals. Scanned PDF OCR remains in the original application.
- `src/server/ai`: provider interface and the existing OpenAI/Codex/Copilot orchestration. Per-user daily budget applies to every underlying request, including failures. JD extraction and constrained resume proposals use the real configured provider. Deterministic matching uses no AI request and requires a confirmed profile, reviewed checklist and exact source evidence. Daily document attempts are limited separately.
- `prisma`: versioned PostgreSQL schema and initial SQL migration. Production migration is explicit (`migrate deploy`), with no demo data or automatic destructive sync.
- `tests`: native unit tests and Playwright tests with a dedicated `_test` database. Real OIDC account login must also be verified against your configured provider before deployment.

The job index is shared public employer data; profile, documents, resume versions, applications, AI runs and conversations belong to an authenticated user. Auth identity linking is never performed solely by matching email. AI output is untrusted text rendered without HTML; verification reduces unsupported evidence but cannot guarantee factual correctness.

## Real job data and preservation

```sh
# Fetch configured public employer feeds, write actual openings to PostgreSQL:
npm --prefix apps/careerpilot run jobs:ingest
# Repeat hourly in a worker process:
npm --prefix apps/careerpilot run jobs:ingest -- --watch
# Import the existing local job catalogue without altering the source:
npm --prefix apps/careerpilot run data:import
```

`JOB_EMPLOYER_BOARDS` explicitly configures reviewed employer boards for the new worker; empty / `[]` configures none. The legacy UK directory remains a list of candidate sources, not a claim of live connectivity. The new worker has real Greenhouse, Lever, Ashby and SmartRecruiters public posting adapters, with persisted source health and refresh leases. Existing optional NHS feed collection remains in the original application and its NHS records can be imported through the explicit legacy catalogue import. Custom employers saved in legacy `.data/employers.json` are not implicitly moved; include them in the new worker's environment after review. No removed-provider integration is restored.

Search reads PostgreSQL, never a hardcoded result array. Restrictive filters exclude missing salary/date metadata. Results show source and last observation, not a guarantee of vacancy availability. Missing capped-feed results are not falsely marked closed. Every profile-overlap recommendation is labelled as a deterministic baseline; it is not an AI hiring score. Users can request an actual AI evidence review on a selected job. Semantic AI ranking, complete employer enumeration and distributed ingestion scheduling are later modules.

The existing browser-local history and application notes remain in the original application/origin. Exported PDF/DOCX resumes can be uploaded into the new library. An automatic private-browser-data migration is intentionally not enabled. Back up PostgreSQL, root `.data` and browser exports before any future cutover; no cutover is performed here.

## Routes

Public: `/`, `/login`, `/setup`, `/api/auth/*`, `/api/jobs`, `/api/health` (readiness only).

Authenticated workspace: `/dashboard`, `/jobs`, `/jobs/[id]`, `/profile`, `/resumes`, `/match`, `/applications`, `/recommendations`, `/assistant`.

Private APIs: `POST /api/profile`, `POST /api/resumes`, owned `GET /api/resumes/[id]/export?format=pdf|docx`, `POST /api/documents`, `POST /api/applications`, owned `GET/PATCH /api/applications/[id]`, `POST /api/ai/match`, `POST /api/ai/assistant`.

Profile and master-resume forms persist real records. Tailoring saves a separate version. Status updates do not submit applications. Previous career conversations are owner-scoped. AI provider errors return explicit failures and never substitute fabricated responses. The new assistant's answer and validated resume citations are stored in the owned conversation.

## Checks

```sh
npm test # existing app regression suite
npm --prefix apps/careerpilot test
npm --prefix apps/careerpilot run typecheck
npm --prefix apps/careerpilot run lint
npm --prefix apps/careerpilot run build
# Create a separate database named careerpilot_test; apply the same migration there.
# Set E2E_DATABASE_URL to it (the configuration rejects other database names).
npm --prefix apps/careerpilot exec playwright install chromium
npm --prefix apps/careerpilot run test:e2e
```

E2E fixtures create opaque sessions directly in the isolated test database; there is no HTTP test-login endpoint or server authentication bypass. Tests verify unauthenticated redirects/401, real profile persistence, cross-owner resume export and tracker rejection, and origin validation. Use a configured identity-provider staging environment to validate the full browser login/callback/logout flow separately.

## Docker

From this folder copy `.env.example` to `.env`. Set a URL-safe random `POSTGRES_PASSWORD`, the matching `DATABASE_URL`, the identity-provider settings and a random `AUTH_SECRET`.

```sh
docker compose --env-file .env up --build
```

The Postgres volume persists data. A migration service completes before web/worker startup. Web runs as a non-root user, binds host port 3100 to loopback, and uses Next standalone output. The development-only legacy HTTP API is not started in this image. Localhost HTTP is supported for local smoke tests; production origins must use HTTPS behind a correctly configured reverse proxy. Configure upstream body/request rate limits, trusted proxy handling, secret storage, encrypted backups, retention/deletion procedures, provider billing limits and monitoring before public deployment. CLI providers require their real installations/authentication in the hosting environment; containers do not fake these integrations.

## Remaining release work

Resolve/install and lock dependencies; validate generated Prisma types against the migration; execute migrations on empty and restored databases; pass all checks and isolated E2E tests; exercise real OIDC/provider/document flows; add end-to-end logout/expiry and broader document/AI integration tests; configure host-level authentication request throttling and per-request AI cancellation/queueing; perform accessibility, dependency/security and operational reviews. The foundation does not claim these deployment-dependent gates have passed.

## Redesigned workspace

The responsive navy/blue/mint UI includes light/dark/system appearance, Saved Jobs (`/saved`) and Settings (`/settings`), split discovery, live resume preview/comparison and Kanban/table tracking. Apply **all** checked-in migrations for resume associations and follow-up reminders. Calendar downloads represent saved reminders; no email service is simulated. Existing routes, employer/provider adapters and exports are preserved. See [the UI implementation report](../../docs/UI_REDESIGN.md) for component boundaries, accessibility checks and remaining browser verification.


## Complete job discovery module

See [job discovery architecture, provider verification and setup](../../docs/JOB_DISCOVERY.md). The latest additive migration adds source observations, canonical identity, saved searches, independent saved/hidden collections, extra metadata and search indexes. Run `jobs:reindex` after migration to conservatively identify existing canonical-link duplicates while retaining IDs and history. Filters include typed keywords/skills, location and optional postcode radius, salary bounds, employment, seniority/experience, company facts, benefits, verified sponsorship and exclusions. Unknown metadata stays unknown. Configure actual boards, PostgreSQL and permitted optional geocoding before expecting live collection; no real deployment/provider health is asserted by the source code alone.

## Candidate profiles and protected original resumes

The `/profile` workspace now owns resume upload, extracted facts, evidence review, multiple immutable baselines and explicit active-master selection. Configure `DOCUMENT_ENCRYPTION_KEYS` and `DOCUMENT_ACTIVE_KEY_ID` before uploading, then apply migration `202610220004_candidate_baselines`. Missing keys produce a visible configuration error; no unencrypted fallback is used. Existing extracted text remains available, but originals discarded by older versions must be re-uploaded. See [candidate profile setup, security and verification](../../docs/CANDIDATE_PROFILE.md). Optional AI assistance uses the existing configured provider and requires review; deterministic parsing needs no AI credentials.

## Evidence-backed JD analysis and matching

Apply migration `202610220005_evidence_matching`, confirm a master in Candidate Profile, then open JD Analyzer or Resume Match on a collected job. Extract and review the requirement checklist before scoring. Compatibility uses configurable deterministic weights with exact candidate evidence, never an AI-generated ATS score. Reports retain immutable JD/profile/resume versions, component rationale and evidence audit links. Supported employer URLs must already exist in the collected catalogue; arbitrary pages require pasted JD text. Tailoring reorders confirmed entries into a separate exportable artifact. See [JD matching setup, scoring and test status](../../docs/JD_MATCHING.md).

## Intelligent UK CV builder

Open **My Resumes → Open the intelligent CV builder** after applying migration `202610220006_resume_builder`. Start from a confirmed profile/job match, request actual AI suggestions, review evidence and accept/reject edits, then approve a new version. Real single-column A4 DOCX/PDF exports are text re-extracted before approval and download. Unsupported manual wording remains draft-only; new facts require confirmation in Candidate Profile. Originals, active masters and existing versions remain preserved. [Builder setup, truthfulness boundaries, fonts and verification status](../../docs/RESUME_BUILDER.md).

## Application tracker and career dashboard

Apply migration `202610220007_application_pipeline` for the ten-stage pipeline, private manual applications, status history, interview/recruiter details and cover-letter attachments. `/applications` provides drag/drop and keyboard status changes, table view, search/filter/sort and paginated persistence. `/dashboard` calculates disclosed conversion rates from explicit application/outcome records. Tailored resume screens can save the selected job and create Preparing without implying submission. Optional cover letters require the existing private-document encryption keyring. [Tracker setup, metric definitions and test status](../../docs/APPLICATION_TRACKER.md).


## Release audit and continuous journey

The 23 October review is **NO-GO for production**: 82 native app tests and 163 existing regressions passed, but dependency installation, real database migrations, lint/types/build, browser journeys, audits and real-provider checks remain blocked/unverified. See the [audit](../../docs/RELEASE_AUDIT.md), [test report](../../docs/TEST_REPORT.md) and [complete setup/deployment runbook](../../docs/PRODUCTION_RUNBOOK.md).

Run `npm --prefix apps/careerpilot run preflight` for safe prerequisite/configuration validation. Release gates include `test:integration:required` and, with explicit isolated test configuration, `E2E_PROVIDER_FIXTURES=1 npm --prefix apps/careerpilot run test:e2e:journey`. The primary journey exercises the actual OIDC callback/session and application handlers with explicitly isolated external identity/AI fixtures; older tests additionally use direct test sessions. Neither proves live provider connectivity. CI and Docker require the missing reviewed app lockfile before building. No fixture flags belong in production.


## Local password sign-in without PostgreSQL

Set `AUTH_MODE=file` and `APP_URL=http://localhost:3100` in this app's `.env`, restart the development server, and open `/login` to create your first account. No default password is provided. Password hashes and eight-hour sessions are saved privately under `.local/auth/`. The app-local environment has been switched to this mode for the current workspace.

This enables account access only. Career records still require PostgreSQL, so file-mode users land on `/local-account` with an explicit setup message. Production rejects file mode. OIDC mode and its data are preserved; local users do not link by email. See [local authentication setup/security/limits](../../docs/LOCAL_AUTH.md). Run `test:e2e:local-auth` for the isolated browser scenario once dependencies are installed.

Local-auth follow-up: app dependencies are now present; lint and 88 native tests pass. Prisma generation/type/build are blocked by binaries.prisma.sh DNS, and this environment denies local listening sockets (EPERM), so the browser flow remains unverified. Prisma generation itself does not require a running database.


## Guest access to the local workflow

Run `npm run guest:dev` from the repository root and open `http://localhost:5173/?guest=1`. This separate local workspace needs no sign-in, OIDC, PostgreSQL or Prisma generation. Login also offers Continue as guest during local development. AI actions still need a real configured provider. Guest jobs, history and typed drafts use separate browser keys; original files and newer database-only audit/profile/chat features are not available here. See [guest setup/features/limits](../../docs/GUEST_MODE.md).


## Landing sign-in and account registration

Use **Sign in** on the landing page for an email/password pop-up in local file mode. **Create account** opens a separate registration pop-up. Multiple local accounts are now supported with duplicate-email checks; the earlier first-account-only setup UI is superseded. `/login` opens the sign-in dialog on the landing page. Actual sessions/password hashing remain file-backed locally; OIDC mode uses its configured provider. See [local auth details](../../docs/LOCAL_AUTH.md).


## Guest button routing fix

Continue as guest now opens the built-in `/guest` route on CareerPilot's own origin. Run only `npm run careerpilot:dev`; its predev step builds guest assets automatically. No port-5173 process or GUEST_WORKSPACE_URL is needed. APIs run in-process under `/api/guest/*`. Restart an existing server once for the startup changes. Earlier standalone guest instructions above are superseded for the landing button. [Current guest setup and limits](../../docs/GUEST_MODE.md).


Guest API compilation regression check: `npm --prefix apps/careerpilot run test:guest:compile` uses the actual guest route in an isolated Next/Turbopack compilation, without Prisma/database/socket setup. It catches build-time path/import errors that ordinary Node handler tests cannot catch. Runtime catalogues are read from explicit filesystem paths; they are not application build assets.


Local registration now has database-free cookie/session/page/logout boundaries. Verify actual handler and cookie behavior with `test:auth:local`, and the real Next route/page compilation with `test:auth:compile`. These checks need installed app/root dependencies, but no PostgreSQL or generated Prisma client. Local sign-out uses `/api/auth/local/logout`; OIDC sign-out keeps its existing endpoint. Refresh an existing landing page to load the corrected modal error handling.


## Guest access is visitor-only

An active account session hides all guest links/promotions on the landing and account pages. Guest page/API entry redirects or refuses authenticated sessions, including the legacy HTML URL; signing out restores visitor access. Existing anonymous browser records are retained separately. Local accounts show actual workspace setup rather than a guest-tool fallback; database-backed career features still require their existing setup. Public OIDC visibility reads existing session tables by hashed token; real PostgreSQL verification remains a release gate.
