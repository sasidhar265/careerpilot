# Application tracker and career dashboard

## Implemented product flow

`/applications` supports the complete pipeline in product order: Discovered, Saved, Preparing, Applied, Screening, Interview, Offer, Accepted, Rejected and Withdrawn. Existing records/stages are retained. Create a record from a collected job, a reviewed tailored resume, or a manual employer/role entry. Manually entered opportunities stay private tracker records; they are never inserted into the public job catalogue as fake live vacancies.

Use the horizontally scrollable Kanban board, native drag/drop, or the table. The details form provides the same status changes through keyboard-accessible controls. Employer, role, location and official URL are snapshots retained even when a collected job is removed. Employer, role, location and official URL are editable without changing the catalogue listing, submission dates or status history; identity collisions fail with 409 and preserve both records. Details include actual submission date, follow-up, private notes, interview preparation, recruiter contacts, exact resume version, editable interview stages/dates/outcomes/notes, and an encrypted original cover-letter attachment. Calendar export downloads a real follow-up event; there is no simulated email/reminder delivery.

Search employer/role/notes, filter by stage and sort by recent update, application date, follow-up or employer. An Active/Archived/All filter and explicit archive/restore actions also recover records hidden by older bookmark behaviour. Removing a job bookmark archives only Discovered/Saved records; Preparing and progressed applications remain visible. Bookmark saves use the same transactional duplicate checks as manual creation. The server searches all owned selected records and returns 50/page; board counts describe the loaded page, not an invented global pipeline total. Previous/Next and Reload access persisted data. Details saves and drag/drop include revision checks; a stale write returns 409. Refreshes and new sessions load the database.

A status transition appends immutable history. Earlier legacy history cannot be reconstructed: migration adds an explicitly labelled snapshot of the current known stage with import time, rather than fabricated event dates. Later edits to notes never imply a new submission or interaction. Interview-stage records do not automatically advance the pipeline; the candidate records actual status explicitly.

## Submission and outcomes

Opening any official/employer website only navigates to the site. It performs no tracker write. Selecting **Applied** explicitly records submission now if no date was supplied or previously recorded; the candidate can enter/correct a real date. Future actual-submission dates are rejected. Clearing a date or editing notes in an already-Applied legacy record does not manufacture a new submission timestamp.

Interview, offer and acceptance timestamps indicate when those stages were explicitly recorded, not independently verified employer event dates. Later stages never automatically imply earlier interviews, offers or submission. History retains actual recorded stages after rejection/withdrawal. Removing a bookmark cannot hide a Preparing, Applied, Screening, Interview, Offer, Accepted, Rejected or Withdrawn application. Explicit tracker archival remains available. Duplicate create/save actions preserve an existing record's stage and date; they do not regress it to Saved/Preparing or invent submission.

## Resume integration

Reviewed builder CVs and matching-engine tailored versions provide **Save job & create tracker record**. The owner and exact analysis/resume association are checked. For a selected collected job, this saves the job, links the exact generated resume and creates Preparing, or links an existing record while preserving its stage. For a pasted JD without an identified employer/job, the action opens manual entry with the resume preselected; the user supplies the actual employer and URL. It does not guess an employer from the role title.

## Dashboard definitions

The dashboard uses actual persisted records:

- Saved jobs: `SavedJob.saved = true` for the user.
- Submitted: application records with a non-null explicitly recorded `appliedAt`.
- Interviews/offers/acceptances: explicit corresponding stage/timestamp or recorded status history. A later stage alone cannot imply an earlier one.
- Submitted → interview: submitted records with an explicit interview / all submitted records.
- Submitted → offer: submitted records with an explicit offer / all submitted records.
- Offer → acceptance: explicit-offer records with explicit acceptance / all explicit-offer records.

Zero denominators display **Not enough data**. Counts and conversions are all-time, including historical/hidden records; reminders exclude hidden and terminal Accepted/Rejected/Withdrawn records. Upcoming/overdue follow-ups are actual saved dates. Recent resume versions come from owned immutable resume rows.

Relevant jobs use disclosed skill-term overlap among the latest 300 collected open/unexpired observations, not an AI compatibility score or promise of availability. Common missing/partial requirements use the latest analysis per identifiable job (source job ID, then source URL, then pasted JD text hash), among 200 recent reports. Each requirement counts once per job. The sample size is displayed. Missing evidence does not establish that a candidate lacks a qualification.

## Persistence and security

Apply `202610220007_application_pipeline` after earlier migrations. It adds four enum values, application snapshots/details/revision/milestone fields, private cover-letter association, and append-only `ApplicationStatusEvent`. Existing job-linked records are backfilled without deleting data. Optional job relations retain snapshots when a catalogue job is deleted. Enum additions are not referenced as new values until after migration commit; see [PostgreSQL ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html).

Owner-scoped server queries, same-origin writes, Zod schemas, bounded bodies, row locks and revision checks protect operations. Database triggers enforce resume/document ownership and immutable status events. Exact job/URL duplicate records are returned rather than recreated; URL identity removes tracking/fragments but preserves requisition query parameters. Similar employer/role entries with distinct requisitions are retained and flagged. Without a URL, case/space-normalized employer and role identify an existing manual record. Up to 200 create/save-job attempts per account/day are allowed; updates are bounded by request/schema limits.

Private cover letters accept one real PDF/DOCX, up to 5 MB, validated and extracted through the existing bounded worker. Original bytes use AES-256-GCM and existing document identity/integrity checks, with the same required private encryption keyring as resume originals. Download uses the existing authenticated attachment endpoint. Documents are never public URLs. The 200 MB account document quota and upload-attempt quota apply. Detaching an attachment changes the association; it does not overwrite or delete the retained original. Plaintext extracted content and application/contact notes require infrastructure database encryption/TLS/access controls, as elsewhere in the app.

Routes:

- `GET /api/applications?q=&status=&archived=active|all|only&sort=&page=`: owned paginated results/details/history.
- `POST /api/applications`: collected job ID, or actual manual employer/role/location/URL; optional resume/status.
- `PATCH /api/applications/:id`: bounded detail/stage/date/attachment updates and expected revision (older API clients may omit revision for compatibility).
- `POST /api/applications/from-resume`: verified owned analysis/generated-resume association; explicit save/prepare action.
- `POST /api/applications/attachments`: private validated PDF/DOCX original.

The tracker itself does not submit applications, contact employers, send emails or invent outcomes. Official URLs are validated/displayed as navigation; arbitrary URLs are not fetched server-side.

## Verification and release gates

Executed: **69 CareerPilot native tests**, **162 existing regressions**, syntax transforms and four affected browser bundles. New native cases cover the ten-stage order, metric denominators, zero/unknown values, no inferred outcomes, retained history outcomes, duplicate URLs/requisition identity and latest-per-job gap aggregation.

Added PostgreSQL tests for persisted create/update details, duplicate preservation, status history, cross-owner access, foreign resume rejection, future dates, optimistic conflicts and history immutability. Extended matching integration to cover actual selected-job tailored-resume → saved job/Preparing and preserving a later Applied state. Added browser coverage for manual creation, preparation persistence, drag/drop, refresh and dashboard counts.

The five PostgreSQL integration scenarios explicitly skip without an isolated `*_test` database. Full typecheck/build/migration stop at missing Prisma, lint at missing ESLint and E2E at missing Playwright Test. Thus live database, browser accessibility/responsiveness and migration execution are not claimed to have passed. Install dependencies, configure PostgreSQL/auth/document encryption, generate Prisma and apply migrations, then run those release checks before deployment.
