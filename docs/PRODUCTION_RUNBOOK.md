# Setup and production runbook

Status: **NO-GO pending the gates in [TEST_REPORT.md](TEST_REPORT.md)**. These are instructions to execute, not evidence that deployment succeeded. Keep the legacy application and its data intact; the Next application is an independent workspace on port 3100.

## Dependencies and configuration

Use a supported Node version satisfying `>=22.12.0` and PostgreSQL 17. The audit host used Node 26.8.1; the committed CI selects Node 22. Obtain registry access first. Verify that every pinned app package version exists and that Next/React/Prisma versions are compatible; publication was not verifiable here. Resolve any incompatibility as a reviewed dependency change. Run `npm ci` at the repository root, then the first successful `npm --prefix apps/careerpilot install` to generate the missing app lockfile. Review and commit that lockfile and subsequently use `npm --prefix apps/careerpilot ci`. Do not fabricate a lockfile or use a nondeterministic production install. The image and CI intentionally require it.

Copy `apps/careerpilot/.env.example` to `apps/careerpilot/.env`; never copy the root environment or commit secrets. Configure:

- `APP_URL`: exact root origin; HTTPS for public production, without credentials, path, query or fragment. Localhost HTTP is allowed for local smoke tests only.
- `DATABASE_URL`: dedicated PostgreSQL connection with proper credentials/TLS. Use a separate migration role with DDL permissions where possible and a restricted runtime role. Test URLs must end in `_test` and must never point at real candidate data.
- `AUTH_SECRET`: at least 32 random characters (`openssl rand -base64 48`). Configure real `AUTH_ISSUER`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`; register exactly `APP_URL/api/auth/callback`. Provider must support discovery, PKCE, nonce and client-secret-post. Auth registration uses the provider; no fake local account flow exists.
- `DOCUMENT_ENCRYPTION_KEYS`: JSON object mapping key IDs to base64-encoded 32-byte keys; `DOCUMENT_ACTIVE_KEY_ID`: a present key ID. Generate keys with `openssl rand -base64 32`. Keep old keys for retained ciphertext and back them up separately in a secret manager. Loss of keys prevents original-document recovery. Rotation/re-encryption requires a tested procedure; switching the active ID does not re-encrypt historical files.
- `AI_PROVIDER`: real configured provider. For OpenAI configure `OPENAI_API_KEY` and an accessible `OPENAI_MODEL`. CLI alternatives require installed/authenticated providers and strict OS/filesystem isolation from application credentials, other users and network resources. Environment filtering alone is insufficient multi-tenant isolation; use the hosted API path unless that boundary is established.
- `JOB_EMPLOYER_BOARDS`: reviewed permitted employer boards. Empty means no live refresh. Public ATS adapters exist for Greenhouse, Lever, Ashby and SmartRecruiters; none was demonstrated connected in this audit. Unknown salary/sponsorship/freshness must stay unknown. NHS collection remains in the legacy app; no new universal UK/NHS API is implied. See [source documentation](JOB_DISCOVERY.md).
- Optional geocoding/company facts/font settings have their documented permissions and paired-font requirements. Do not place private settings under `NEXT_PUBLIC_` or `VITE_`.

Run `npm --prefix apps/careerpilot run preflight`. It checks safe configuration syntax/presence and prerequisites, does not echo values, and does not prove connectivity. It deliberately never declares a runtime release ready.

## Database and local startup

Back up any existing database before migration. Apply the checked-in migrations in order; do not use `db push`, reset a real database or edit an applied migration to bypass errors.

```sh
npm --prefix apps/careerpilot run db:generate
npm --prefix apps/careerpilot run db:migrate
npm run careerpilot:dev
```

Visit `http://localhost:3100`. Execute real identity login before uploading a non-sensitive DOCX/PDF. Original encrypted storage requires the keyring. Scanned/image-only PDF needs OCR outside this module. UTF-16 XML DOCX is unsupported; ambiguous extraction requires human confirmation. Supported employer URL JD import is limited to collected catalogue entries; otherwise paste the JD.

On dedicated empty and restored staging databases, verify migration deployment, rerun idempotency, ownership/immutability triggers, retained originals and existing saved records. Compare counts and representative records before/after. SQL being checked in is not proof that migrations work. The legacy catalogue import is opt-in and must not be labelled a newly live feed.

## Required test gates

Create isolated PostgreSQL databases ending in `_test`, set `INTEGRATION_DATABASE_URL` and `E2E_DATABASE_URL`, and apply all migrations to each using a process-scoped `DATABASE_URL`. The tests can modify and delete their records; never use production credentials. Install Chromium with the app-local Playwright package after dependency installation.

```sh
npm test
npm --prefix apps/careerpilot test
npm --prefix apps/careerpilot run typecheck
npm --prefix apps/careerpilot run lint
npm --prefix apps/careerpilot run test:integration:required
npm --prefix apps/careerpilot run build
npm --prefix apps/careerpilot exec -- playwright install chromium
E2E_PROVIDER_FIXTURES=1 npm --prefix apps/careerpilot run test:e2e
E2E_PROVIDER_FIXTURES=1 npm --prefix apps/careerpilot run test:e2e:journey
npm audit --omit=dev --audit-level=high
npm --prefix apps/careerpilot audit --omit=dev --audit-level=high
```

The fixture flag is test-process-only and rejected outside isolated local testing. Never set fixture/preload variables on production services. Passing fixture tests still requires a separate staging journey against your actual OIDC provider, AI account and at least one permitted real employer board. Verify callback/logout/session expiry, cross-user private IDs, source outages/429s, malformed upload handling, approved exports, exact original preservation and return-session persistence. Confirm all fifteen audit steps with a non-sensitive real resume. Validate desktop/tablet/mobile, keyboard-only interaction, visible focus, labels/announcements and screen-reader navigation; automated overflow checks are insufficient.

## Production operation

After passing gates, build and start using the reviewed lockfile: `npm --prefix apps/careerpilot run build`, then `npm --prefix apps/careerpilot start`. For the provided Compose setup run from `apps/careerpilot`: `docker compose --env-file .env up --build`. Set `POSTGRES_PASSWORD` to a URL-safe random value; host DATABASE_URL must match. Compose substitutes its internal database hostname. Migration service precedes web/worker startup. Docker must have a running daemon; image building has not been validated here.

Put the loopback web binding behind a TLS reverse proxy with explicit host routing, request/body/time limits and authentication/IP rate limiting. Verify Secure/HttpOnly/SameSite cookies and no-store private responses through the proxy. Add CSP/HSTS after validating actual resources and HTTPS, not through an untested blanket policy. Use private PostgreSQL networking, encrypted disks/backups, secret injection, restricted egress and a non-root runtime. Never expose the legacy development API as a multi-tenant production service. Restrict upload limits to match the application (20 MB; PDF/ZIP limits documented in candidate module).

Schedule `jobs:ingest -- --watch` or a single managed scheduled worker; monitor source leases, errors, stale observations and last-verified timestamps. Empty boards create no live listings. Monitor `/api/health`, database availability, storage/ciphertext growth, API failures, AI quota/latency/cost, source failure rates and backup age. Health alone does not certify OIDC, AI or the complete journey. Logs and alerts must omit resume text, identity tokens, encryption keys, credentials and provider request bodies. Browser traces are sensitive artifacts with restricted access and short retention.

Define retention/deletion for originals, extracted profiles, generated versions, analysis and backups. No full automated retention/erasure process is certified. Test an encrypted backup restore including key access and migrations; database-only backups are insufficient without the encryption keyring. Establish recovery objectives, incident owners and AI provider spend limits.

Use a pre-release snapshot and staged rollout. Application rollback may leave additive schema in place only after compatibility verification. Do not blindly reverse migrations containing real data; restore a verified backup or ship a reviewed forward fix. Production approval requires a fresh passing report, real-provider evidence and resolved high-risk operational items. This audit did not deploy or approve a release.


Local development alternative: [file-backed authentication](LOCAL_AUTH.md) now supports account operations without OIDC/PostgreSQL. It is explicitly disabled in production and does not migrate career records. Later verification found packages/lockfile present, but Prisma engine download and local port permissions remain blockers; see the test report follow-up.
