# CareerPilotAI integration and release audit

Audit date: 23 October 2026. Decision: **NO-GO for production**. Implementation and locally executable tests were reviewed; the full application has not been demonstrated running in this environment. Existing legacy functionality and private data were preserved. No deployment or external account changes were performed.

## Findings and changes

| ID | Severity | Finding and disposition | Verification |
|---|---|---|---|
| R01 | Release blocker | App dependencies, reviewed app lockfile and Prisma client are absent. Package publication/version compatibility remains unverified. Install failed with npm DNS ENOTFOUND. | Observed; unresolved. CI and image build now require the lockfile. |
| R02 | Release blocker | No running PostgreSQL; two isolated initdb attempts failed at shared-memory allocation. Docker daemon unavailable. Migrations, persistence, ownership queries and browser workflows cannot be certified. | Observed; unresolved. Required test runners fail rather than count skips as success. |
| R03 | High | DOCX paragraph spacing split one employment into invented job groupings. Group extraction across blank paragraphs, preserve literal dates and leave ambiguous role titles unconfirmed. | Actual DOCX/PDF extraction regression tests pass. Complex layouts remain review-required. |
| R04 | High | CLI AI children inherited application secrets. Filter database/auth/document/API secrets from child environments without mutating the parent. | Regression test passes. Production CLI providers still require filesystem/process isolation. |
| R05 | High | UTF-16 XML could evade DOCX declaration checks. Reject unsupported NUL-containing XML/relationships; contain worker stdout/stderr. | Hostile archive and extraction unit tests pass. UTF-16 XML DOCX is explicitly unsupported. |
| R06 | Medium | Private error responses and auth redirects needed consistent no-store controls; HTTPS OIDC attempt cookie lacked host prefix. Added cache headers and host-prefixed names. | Native header/cookie tests pass; deployed proxy/browser behavior unverified. |
| R07 | Medium | Dashboard follow-up links did not select their records; selected tracker rows beyond the loaded page could not open. Added owned detail lookup and focused-record loading; corrected route service import. | Syntax checked; ownership integration scenario added but not executed. |
| R08 | Medium | Runtime origin validation was weaker than preflight. Centralized root-origin validation with HTTPS in production, except explicit local smoke origins. | Native rejection/acceptance tests pass. |
| R09 | Medium | Broad worker environment and build context exposed unnecessary private material. Restricted worker variables; excluded credential directories, keys and DOCX from images. | Configuration review only; container build unexecuted. |
| R10 | Release blocker | Real OIDC, AI, employer collection, accessibility, dependency advisories and production deployment remain unverified. | Staging gates required; no live integrations claimed. |

These are targeted corrections with documented workflow/security reasons, not a redesign. No exhaustive security certification or accessibility conformance is asserted.

## Complete user journey

| Step | Implemented verification | Actual result here |
|---|---|---|
| 1. Register/log in | Continuous Playwright flow through actual app OIDC callback/session, isolated signed IdP fixture | Not executed; real IdP also outstanding |
| 2–3. Upload/extract/review | Real DOCX UI upload, original byte equality, confirmed profile/active baseline | Document extraction unit tests pass; browser/DB unverified |
| 4–5. Search/select job or paste JD | Actual search APIs/UI with explicitly labelled isolated employer/job fixture | Browser/DB/live feeds unverified |
| 6–7. Analyse/score with evidence | Reviewed requirement schema, deterministic weighted scoring and evidence validation | Unit tests pass; persisted UI journey unverified |
| 8–10. Generate/review/save | Constrained AI fixture through real adapter, approval, immutable version and original preservation | Builder unit tests pass; DB/browser unverified |
| 11. Download DOCX/PDF | Real document generators and text re-extraction; browser download assertions added | Native round trips pass; browser download unverified |
| 12. Open employer link | Fixture employer navigation asserts no automatic submission | Added; not executed against browser or real employer |
| 13–14. Manually submit/track | Actual tracker form, explicit date/status, Interview notes/history | Calculation/state tests pass; persistence unverified |
| 15. Return/retrieve | Logout, second OIDC login, data retrieval and session-expiry checks | Added; not executed |

The new primary journey substitutes only explicitly isolated external identity/AI/employer boundaries. It does not mock application handlers or replace production integrations. Fixture guards reject production/non-loopback/non-test-database execution. It cannot prove provider terms, uptime or real model quality.

## Security and UX scope

Reviewed session/origin/ownership boundaries, document encryption and archive limits, immutable baselines/versions, schema-grounded evidence, private serving, rendered text, logging and deployment configuration. No raw private documents or environment secrets were read during this audit. Native tests cover malformed documents, evidence rejection, provider errors, document preservation and scoring. Database constraints and cross-user denial scenarios exist but must execute against PostgreSQL before relying on them.

Browser scenarios include navigation, mobile overflow and keyboard controls. Visual layouts, screen-reader behavior, focus order, contrast, actual upload progress/error recovery and all route/button combinations require a running staging application. Code review and syntax checks do not establish these results. Host-level login throttling, cancellation/queueing, encrypted backups and CLI process isolation remain operational work.

See [test report](TEST_REPORT.md), [production runbook](PRODUCTION_RUNBOOK.md) and [implementation plan](IMPLEMENTATION_PLAN.md).
