# Candidate profile and immutable resume baselines

## Implemented boundaries

- `/profile`: accessible file input and drag/drop, real XHR byte progress, processing state, original extracted-text preview, evidence-backed section editor, individual uncertain-field confirmation, draft/confirmed saves, explicit activation and paginated version history. Each section supports entry creation/removal; applicable sections support responsibility/achievement/contribution bullets. Dates remain literal strings. Original files download through an authenticated attachment route.
- `src/lib/profile/extraction.mjs`: extension, MIME and signature validation; bounded PDF.js/Mammoth worker (25 seconds, 128 MB old-generation heap, two concurrent workers per process). PDF limits: 100 pages and 45,000 extracted characters. DOCX containers undergo ZIP structure, CRC, traversal, macro, XML entity, encryption and cumulative expansion checks before conversion. Uploaded files never become executable code or filesystem paths.
- `src/lib/profile/model.ts` and `parse.ts`: bounded structured schema, exact source spans and page references, deterministic extraction, conservative AI quote validation, immutable text rendering. Supported categories: contact details, summary, employment, responsibilities/achievements, skills, projects, education, certifications, languages and domains. Missing fields stay blank; uncertain associations and all AI suggestions require confirmation. Negated AI evidence is conservatively rejected, potentially discarding some valid sentences for manual review.
- `src/server/profile/service.ts`: owner checks, transactions, revision conflict detection, baseline/version persistence, active master resolution and private encrypted originals. Existing compact-profile saves append audited corrections. The existing actual AI provider service supplies optional assistance and retains its quota/failure behavior. AI failures never silently become successful AI extractions.
- Additive migration `202610220004_candidate_baselines`: `ResumeBaseline`, `ProfileVersion`, profile active pointers, encrypted document envelope, ownership and immutable-payload triggers. Existing documents/resumes are retained. Old text-only extractions cannot recover original bytes: upload the original to create a baseline. Existing users retain legacy master behavior until explicitly activating a reviewed baseline.

## Configuration and operation

Install root and CareerPilot dependencies, configure PostgreSQL and authentication, then generate Prisma and apply migrations using the app README. In the private app environment set:

```dotenv
DOCUMENT_ENCRYPTION_KEYS={"v1":"<base64-encoded 32-byte secret>"}
DOCUMENT_ACTIVE_KEY_ID=v1
```

Generate each secret with `openssl rand -base64 32`; provision it using your secret manager. Do not paste it into source control. The service fails closed with 503 when private storage is not configured. AES-256-GCM uses independent random nonces, authenticated document/user/type/hash identity and a SHA-256 integrity check on download. Ciphertext resides in PostgreSQL bytea, with no public file path or public bucket.

For rotation, retain every old key ID and value in the keyring and choose a new active ID. Old ciphertext remains immutable and is decrypted using its original key ID; removing a needed old key makes its originals unavailable. Back up keys separately with controlled access. Use TLS database connections, restricted database credentials, encrypted database volumes/backups and production HTTPS. Structured profile text, extracted text and AI audit outputs are private database records but are **not field encrypted**; infrastructure encryption remains necessary for them. The worker limits JavaScript heap/time, not a separate OS/container security boundary; enforce process memory/concurrency limits in production infrastructure too.

Limits: 20 MB per original, 50 baselines and 200 MB originals per account, existing 10 upload attempts/day, 200 profile mutations/day, 350 profile facts, 20 history records/page. No history is trimmed. Unsupported/password-protected/malformed files fail visibly. Scanned/empty pages produce warnings and manual transcription, not simulated OCR. Manual transcriptions are separately retained and explicitly labelled; evidence does not become original-document evidence.

Confirmed saves require complete source review, acknowledgement of extraction warnings and confirmation/removal of every uncertain field. User corrections are explicit user assertions, not new source evidence. Activation is a separate action; uploading, generating or saving another resume never implicitly switches an already selected baseline. Match selectors and the assistant resolve the selected master. The original download always returns the original bytes, never the rendered profile or generated resume.

A stale editor receives 409 and retains its local edits. Reloading/switching prompts before discarding unsaved changes. Forking an older version appends a new revision and retains its parent. For account erasure, clear both active pointers, delete profile versions, then baselines and documents, then the user inside an administrator-controlled transaction. This explicit deletion order is necessary because baseline/document relations restrict accidental deletion. No new public deletion endpoint is exposed.

## Validation and release gates

Executed here: 36 CareerPilot native tests, including actual generated PDF/DOCX extraction, malformed PDF/unsafe ZIP, input limits, missing readable text, deterministic fields/dates, uncertain facts, unsupported/negated AI suggestions, correction evidence invalidation, and encryption identity/tamper/key-rotation checks. Existing regression suite: 160 tests. Syntax transforms and the new browser bundle also pass.

Added isolated-PostgreSQL integration coverage for original preservation, cross-owner denial, reviewed saves, explicit active selection, conflicts, history and database immutability. Added Playwright upload/review/activation/download/isolation coverage. Both require a migrated test database (`*_test`) and installed app dependencies; browser upload tests additionally require a test keyring in the application process.

This environment cannot install dependencies (npm DNS ENOTFOUND). Full typecheck/build/migration stop at missing Prisma, lint at missing ESLint, integration runner at missing tsx, and E2E at the unavailable Playwright Test runner. These are unexecuted release gates, not passing checks. Real PostgreSQL operation, browser accessibility/responsiveness and standalone Docker worker tracing must be verified after dependencies and services are available.

Primary implementation references: [Mammoth raw-text extraction and security](https://github.com/mwilliamson/mammoth.js), [PDF.js](https://github.com/mozilla/pdf.js), [Node crypto](https://nodejs.org/api/crypto.html).
