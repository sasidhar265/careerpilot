# CareerPilot AI job discovery

## Provider verification and operational status

Official documentation was checked on 22 October 2026. Implemented providers perform real HTTP requests through a bounded, rate-aware transport; production code does not substitute fixtures. **No successful live ingestion or database deployment was verified in this restricted implementation environment.** An implemented adapter is not a claim that a particular employer board is currently available or licensed for republication.

| Provider | Implemented public read API | Data / constraints | Configuration |
|---|---|---|---|
| [Greenhouse](https://docs.greenhouse.io/job-board) | `boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true` | Published board data and departments; public metadata when supplied. `updated_at` is not treated as a posting date. Pay is unknown unless the adapter has an explicit annual GBP contract; Greenhouse pay-transparency ranges are not guessed into annual salaries. | Explicit board slug. Documented public GET requests do not require an API key. |
| [Lever](https://github.com/lever/postings-api) | `api[.eu].lever.co/v0/postings/{board}?mode=json&limit=100&skip=…` | Requirements/benefit lists, commitment, department, workplace and annual GBP range when supplied; global/EU support; 1,000-posting cap. | Board slug and region. Public posting API only. |
| [Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api) | `api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true` | Only explicitly listed postings; UK secondary locations supported; compensation includes only annual GBP salary components. | Board name. Public job-board endpoint; no private Ashby API credentials are used. |
| [SmartRecruiters](https://developers.smartrecruiters.com/docs/endpoints) | `api.smartrecruiters.com/v1/companies/{board}/postings?country=gb&limit=100&offset=…` and posting details | Country, supplied coordinates, industry, department, experience level and qualifications. At most 1,000 summaries and 100 full-detail requests per run. Missing detail requests keep labelled excerpts. | Company identifier. Requests use the public posting endpoint without internal credentials. A 401/403 records `ACCESS_DENIED`; access restrictions are not bypassed. |
| [Postcodes.io](https://postcodes.io/docs/api/lookup-postcode/) | `api.postcodes.io/postcodes/{postcode}` | Optional geocoding service, not a job provider. Full-postcode origins and exact-postcode enrichment only. | `JOB_GEOCODING_ENABLED=true`; outbound access; appropriate [data licences/attribution](https://postcodes.io/docs/licences/). NI postcode use is separately disabled unless `JOB_NI_POSTCODES_ALLOWED=true` is set for a permitted use. |

These APIs are intended for employer/job-board integrations; public technical access does not establish unrestricted commercial redistribution rights. Configure only employer boards you are entitled to access and display, and retain required provider/data attribution. Postcodes.io distinguishes Great Britain data from Northern Ireland data; its current licence page describes additional conditions for commercial NI use. No HiringCafe data access, scraping, access-restriction bypass, Adzuna dependency or unlicensed vendor credential simulation is implemented.

Licensed aggregate providers and authorised partner feeds were considered as separate adapters, but none is represented as connected without an access agreement, credentials and a defined schema. The original optional NHS feed workflow remains available in the legacy app; authentic NHS catalogue records can be imported, with freshness explicitly unverified. There is no new dedicated live NHS provider in this worker.

## Setup

Install dependencies and configure the app's PostgreSQL/OIDC environment as described in `apps/careerpilot/README.md`. The migration role needs `pg_trgm` available (ask the database administrator to enable that extension if managed PostgreSQL restricts extension creation).

```sh
npm --prefix apps/careerpilot run db:generate
npm --prefix apps/careerpilot run db:migrate
# Preserve existing IDs/history while assigning canonical URLs and flagging exact-link duplicates:
npm --prefix apps/careerpilot run jobs:reindex
```

Set `JOB_EMPLOYER_BOARDS` in **apps/careerpilot/.env**, using your reviewed real board identifiers. Its shape is:

```json
[{"provider":"greenhouse","board":"your-reviewed-board","company":"Your employer name","region":"global"}]
```

This example is a configuration shape, not a working employer or a source of sample vacancies. Empty configuration or `[]` enables no refresh boards. The old registry remains a candidate directory in the legacy application; it is no longer treated as an implicitly connected source set in the new worker. Changing configuration disables removed sources without deleting observations or application history.

```sh
# Collect due sources once:
npm --prefix apps/careerpilot run jobs:ingest
# Force one immediate refresh, then respect persisted due dates:
npm --prefix apps/careerpilot run jobs:ingest -- --force
# Worker polls every minute; successful sources become due after about an hour:
npm --prefix apps/careerpilot run jobs:ingest -- --watch
# Explicit non-destructive historical import, without claiming current verification:
npm --prefix apps/careerpilot run data:import
```

Compose already runs this worker. Source leases prevent two workers claiming the same due source; transport rate pacing is per process, so deploy one worker initially or add a provider-wide distributed request limiter before increasing replicas. Successful refreshes have small schedule jitter; failures back off from five minutes to 24 hours, or longer when `Retry-After` requires it. Stale leases expire. Collection has a 110-second overall budget, at most three concurrent sources, 15-second HTTP timeouts, ten-MB response limits, bounded retries, no redirects, and no alternate-host retries on access denial.

`JOB_COMPANY_FACTS` is an optional administrator-reviewed JSON array. Each record identifies an exact `provider:board:region` key and has a citation `sourceUrl` and a non-future ISO `verifiedAt`, plus optional `industry`, `companySize`, `companyType`, and `description`. Size values are `1-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1001-5000`, `5001+`; type values are `private`, `public`, `nonprofit`, `government`. This is an explicit enrichment input with provenance, not an invented company-data API. Without source facts these fields remain unknown.

## Boundaries and persistence

- `src/lib/jobs/contracts.ts`: provider interface, normalized listing contract, coverage metadata and safe error codes.
- `src/lib/jobs/providers.ts`, `source-http.ts`, `normalize.ts`: real ATS endpoints, bounded pagination, transport, UK scope and conservative normalization. Request injection is used by tests only; default transport uses actual fetch.
- `src/server/jobs/ingest.ts`: configured sources, persisted due dates and leases, idempotent observation/upsert transactions, freshness and import preservation.
- `src/lib/jobs/query.ts`: bounded query parser, URL serialization and parameterized SQL plan. All values remain bind parameters; SQL structure/column names are fixed code. JSON mutation bodies use Zod.
- `src/server/jobs/search.ts`: repeatable-read count/page snapshot, six-second SQL statement timeout, relevance and indexed PostgreSQL queries.
- `src/server/jobs/preferences.ts`: owner-scoped searches/bookmarks, per-user search limit and tracker synchronization.
- `src/server/jobs/geo.ts`: fixed-host postcode lookup, bounded memory cache and explicit area/service configuration.
- Frontend components: `DiscoveryFilters`, `SavedSearches`, `JobDiscovery`, `JobFacts`, `JobPreferences`, `SourceHealth`. Existing application/save, resume/provider and export routes remain intact.

Migration `202610220003_job_discovery` extends jobs/employers and adds JobSource, JobObservation, JobLocation, SavedSearch and SavedJob. Existing application shortlists are copied into SavedJob without creating fake jobs. No original records are deleted. Existing duplicate IDs remain addressable; canonical-link duplicates are excluded from discovery after reindexing. Private bookmarks/searches are never returned as part of public job records.

## Search semantics

All filter values and pagination are URL parameters. Typing/filter changes debounce for 500ms; explicit submit applies immediately. Next navigation handles superseded requests. Restored searches reset pagination. There are 20 results per page, stable ID tie-breaking and a 500-page limit; refine searches beyond 10,000 matches. Searches retain a consistent database snapshot for counts and selected rows.

| Parameters | Behavior |
|---|---|
| `q` | All space-separated words must match title, description or employer. Full text plus literal fallback handles natural words; punctuation-bearing terms keep their literal spelling. Relevance weights title matches and PostgreSQL text rank. |
| `skills` | All comma-separated technology terms; case-insensitive, escaped word-boundary matching in supplied skills/title/description. A mention is not a verified candidate skill or an independently verified job requirement. |
| `location`, `radius` | Text search when radius is zero. Otherwise resolve a full UK postcode and perform exact great-circle distance in miles over known JobLocation points, with a latitude bounding filter. No guessed city centroid; unknown coordinates cannot match radius. |
| `workplace`, `contract`, `employment` | Explicit normalized source values. Full-time does not imply permanent; non-remote does not automatically imply onsite. |
| `salary`, `salaryMax` | Known annual GBP range overlaps the requested range. Unknown endpoints are labelled “from”/“up to”; unknown salary is not zero. No conversion from hourly or foreign-currency pay. |
| `seniority`, `experienceMin`, `experienceMax` | Seniority explicitly stated in source level/title. Experience filters constrain the required minimum years, derived only from explicit public numeric metadata or narrow requirement phrases with retained evidence. Unknown years do not match. |
| `industry`, `department`, `companySize`, `companyType` | Supplied source metadata or cited administrator-reviewed employer facts. No guessed firmographics. |
| `days` | Actual provided posting/publishing date, not collection time or Greenhouse update time. |
| `benefits` | All terms must occur in a separately labelled source benefits section; unknown/unstructured benefits do not satisfy this filter. |
| `visa=yes/no` | Only a literal boolean in Greenhouse public employer metadata named “Visa sponsorship”, with observation time and evidence. Strings, application questions, eligibility assumptions and inferred sponsorship are not promoted to verified facts. |
| `excludedCompanies`, `excludedKeywords` | Comma-separated literal substring exclusions; company names or title/description respectively. Wildcards in user text remain literal. |
| `availability` | `current` excludes known closing-date expiry and missing-from-complete-source flags, while still labelling unverified/stale observations. Other options are `recent` (seven days), `unverified`, `potentially_expired`, and `all`. “Current” is not a promise that an employer will accept applications. |
| `hidden` | `exclude`, `only`, `include`, scoped to the signed-in owner's bookmarks. Public searches do not expose another user's hidden state. |
| `sort` | `relevance`, `newest` (posting date, unknown last), `salary` (unknown last). |

## Identity and freshness

Canonical URLs remove only known marketing parameters, fragments and trailing slash differences. Requisition parameters such as `ref` and `gh_jid` remain intact. A transaction-level advisory lock and unique canonical URL serialize exact-link ingestion. Separate source IDs become observations of the same canonical job. Similar company/title/location fingerprints only show a possible-duplicate warning; they never collapse distinct requisitions.

Actual source enumeration sets `lastVerifiedAt` to its collection start time. This verifies source observation, not that an application form was successfully submitted. Failed, malformed or capped collections never mark missing jobs closed. Only complete enumerations can set `missingSince` and potentially-expired flags, and all known observations must be missing. Returned IDs are retained even when their location data is missing, preventing false expiry. Historical imports/reindexing never set last-verified timestamps or replace newer verified data. Freshness labels distinguish recent observation, stale, unverified, potentially expired and closing date passed.

## API

- `GET /api/jobs`: public job results; optional session scopes hidden preferences.
- `GET /api/jobs/[id]`: public job, company, locations and source provenance.
- `GET /api/job-sources`: configured source health; no secrets or upstream error bodies.
- `GET/POST /api/saved-searches`, owned `DELETE /api/saved-searches/[id]`: name, normalized query, up to 50 saved searches per owner. No notification delivery is claimed.
- Owned `PATCH /api/jobs/[id]/preferences`: `saved`, `hidden`, `collection`. Hiding alone does not create an application. Saving/unsaving synchronizes the existing tracker without resetting its status or deleting history.

`/saved` supports collection filtering, removal and hide/unhide. Every result has Resume Match navigation; actual matching/tailoring reuses the configured AI provider and owned resume library. Apply actions open the source-supplied employer/ATS link; they do not pretend to submit an application.

## Verification and remaining configuration

Unit tests cover URL/range validation, filter combinations, literal SQL binding, technology punctuation/boundaries, geo math construction, pagination parameters, canonical identity, freshness, provider normalizers, rate/access/malformed/oversize failures, bounded retries, partial detail coverage and pagination caps. PostgreSQL integration tests exercise actual query execution, stable pages, combined filters, geospatial selection, owner preferences, saved searches, idempotent ingestion, retained observations and missing-listing lifecycle. Playwright adds debounce/restore, collections, hide/unhide and cross-owner saved-search deletion.

```sh
npm --prefix apps/careerpilot test
# Export INTEGRATION_DATABASE_URL to a migrated, isolated database ending in _test:
npm --prefix apps/careerpilot run test:integration
# E2E requires E2E_DATABASE_URL, both browsers/dependencies and all migrations:
npm --prefix apps/careerpilot run test:e2e
npm --prefix apps/careerpilot run lint
npm --prefix apps/careerpilot run typecheck
npm --prefix apps/careerpilot run build
```

Execution results in this environment: **28 unit tests passed; 159 existing regressions passed.** The PostgreSQL integration scenario was explicitly skipped without a test database, not passed. Dependency install still fails `ENOTFOUND registry.npmjs.org`; lint/typecheck/build stop at missing ESLint/Prisma, and E2E cannot load the required Playwright Test runner. Syntax transforms passed for 101 TypeScript modules and 15 browser bundles resolved without Node-only imports; these checks do not substitute for types or runtime execution. No successful live provider connectivity, SQL migration execution, performance benchmark, browser run or production readiness is claimed. Resolve dependencies/lockfile, configure PostgreSQL and reviewed boards, apply migrations/reindex, run real ingestion and inspect `/api/job-sources`, configure permitted geocoding if needed, then pass integration/browser checks before release.
