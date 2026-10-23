# Evidence-led UK resume builder

## Working flow

Open **My Resumes → Open the intelligent CV builder** (`/resumes/builder`), or **Review AI tailoring suggestions** on a saved JD match. Select a confirmed master and paste/analyse a JD, select a collected job through its Resume Match screen, or restore a saved job analysis. The existing JD review and deterministic matching engine supplies immutable profile/JD version IDs.

Generate suggestions using the configured real AI provider. Review original/proposed text, highlighted changes, exact source facts, and missing-fact questions. Accept, reject or edit each proposal. Reorder sections, choose Classic UK or Compact UK, and set a 200–2,000-word target (default 800). The original and live tailored preview remain visible side by side.

Save drafts freely, including unverified manual wording. Approval requires every proposal to be reviewed, an explicit whole-CV review, supported content, no contradictory employment dates, and successful generation/re-extraction of **both** real DOCX and searchable PDF. Each save appends an immutable version. Restoring an earlier version creates a new draft with that version as parent; no history is rewritten. Approved saved versions have actual DOCX/PDF download links. Downloads always refer to the labelled saved version, never unsaved edits.

## Truthfulness boundary

This release deliberately uses **constrained, extractive AI editing**, not unrestricted paraphrasing presented as proven factual entailment:

- A summary may combine up to four complete statements from the confirmed existing summary or employment responsibility/achievement facts. Project and learning facts cannot become professional-summary evidence.
- Bullet changes preserve the complete original wording, except optional removal of a small allowlist of redundant lead-ins such as “Responsible for”. Capitalisation/whitespace may improve readability. Metrics, tools, titles, dates and factual qualifiers cannot be changed.
- Skills ordering is a checked permutation of the exact original skills entries. No entry or career-history section is dropped. Employment/project evidence stays in its original scope.
- Every approved generated block retains stable source fact IDs; saved versions retain the complete evidence snapshot and accept/reject/edit decisions. Original source quotes/pages and user-confirmed assertions remain distinguished.
- Unsupported AI suggestions are discarded visibly. The manual editor can save new wording as a draft, but unsupported wording cannot be approved/exported through the builder. Confirm new facts or substantive rewrites in Candidate Profile, create a fresh job analysis from that confirmed version, then start a new builder workspace. There is no “confirm AI invention” override in the builder.

This stricter boundary can reject legitimate paraphrases. It prevents a similarity model or a user clicking Accept from silently becoming proof of newly generated professional claims. It does not independently authenticate facts supplied by the candidate. Existing legacy text resumes remain editable/exportable through the original text editor and are not relabelled as builder-approved evidence.

## UK format and document generation

`src/lib/builder/documents.mjs` generates actual DOCX with `docx` and actual PDF with jsPDF. Both primary templates use A4, one column, readable text, standard section headings and chronological employment when dates are parseable. Known employment end/start years and explicitly supplied months determine reverse chronology; ambiguous dates preserve supplied entry order and produce warnings. No months, durations or dates are invented.

Classic uses 11pt body text; Compact uses 10pt. DOCX uses ordinary paragraphs/runs and real list bullets: no content-critical graphics, tables, text boxes or multi-column layout. Text remains editable. PDF embeds Liberation Sans TrueType fonts shipped with PDF.js, including Unicode mappings; it does not rasterise the CV. Templates use the same content with different spacing/type density. Word targets provide guidance rather than deleting history or promising a page count.

Every approval generates both formats, re-extracts them using the bounded PDF.js/Mammoth worker, and compares the complete ordered text after narrow whitespace/bullet/dash normalisation. Export re-runs that validation before returning bytes. A missing glyph or text mismatch stops the export with a visible error instead of returning a corrupted or dummy download. PDF page count and per-format validation metadata are retained on approval. Versioned source text/template are retained, rather than storing regenerated document binaries with changing timestamps as supposedly identical artifacts.

For characters unsupported by the default font, administrators can configure both `RESUME_PDF_FONT_REGULAR` and `RESUME_PDF_FONT_BOLD` as private local TTF paths (max 32 MB each). Mount the files in the deployed container and retain their applicable licences. Both are optional; leaving both blank uses the packaged defaults. One missing path or unreadable/unsupported font is an explicit configuration/export failure. Both formats must pass for builder approval; a PDF glyph error therefore blocks approval until a suitable font is configured or the candidate confirms corrected source text. Fonts are administrator configuration, never uploaded or URL-fetched by candidates.

## Readiness checks

The report carries original extraction/transcription warnings, including after profile corrections. It blocks approval when manual edits flatten or merge the evidence-approved heading/role/bullet lines, while permitting blank-line and within-line spacing changes. The report also shows missing contact/standard sections, length/readability concerns, mixed date formats, ambiguous or reversed employment dates, unreadable characters, unsupported manual wording and new unverified keywords. It distinguishes warnings from approval blockers. It does not infer absence of qualifications or claim an official commercial ATS score, guaranteed ATS pass, hiring probability or exact page target. Actual re-extraction results are recorded separately from these limited structural checks.

## Backend and persistence

Apply additive migration `202610220006_resume_builder` after candidate-profile/matching migrations:

- `BuilderSession`: owner, exact match analysis/profile version, immutable proposals/questions/discarded IDs, revision counter.
- `BuilderVersion`: immutable parent/revision, document blocks, manual text, review decisions, template, word target, source evidence, readiness report, approval timestamp, re-extraction metadata and optional generated resume ID.

Approved versions create separate `TAILORED` resume rows and preserve existing export URLs. Drafts never become downloadable approved resumes. Database guards enforce source association/ownership and immutable saved payloads. Existing original-document/resume immutability remains enforced. The selected active baseline/master is never changed by builder actions.

All routes authenticate the user; writes require same origin and bounded Zod-validated JSON. Workspace/version/export reads check ownership and use private/no-store responses. Saves use row locks, optimistic revision checks and a 200-save/day account budget. AI generation uses the existing provider quota and actual failure behavior. A stale save returns 409 while retaining local edits. Complete history is paginated 20 records/page; records are never trimmed.

Routes:

- `POST /api/builder`: `{analysisId}`; actual AI proposals and strict source validation.
- `GET /api/builder?before=<owned-session-id>`: saved workspace summaries.
- `GET /api/builder/:id`: owned source/proposals/history.
- `GET /api/builder/:id/versions?before=<revision>`: version summaries.
- `GET /api/builder/:id/versions/:versionId`: exact saved version.
- `POST /api/builder/:id/versions`: bounded decisions/order/text/template/target/review/approval plus expected revision and parent ID.
- Existing `GET /api/resumes/:id/export?format=pdf|docx`: actual generated bytes with `X-Resume-Validation: EXACT_TEXT` after successful re-extraction.

Deployment requires root/app dependencies, generated Prisma client, migrated PostgreSQL, OIDC authentication, the existing configured AI provider, PDF.js/Mammoth worker assets and font assets. Next standalone tracing includes PDF.js fonts/worker files. Real container tracing remains a release check. Private originals retain their encryption-key configuration; builder code never overwrites or re-encrypts them. Resume/evidence records are private database data; infrastructure TLS/encryption/access controls still apply.

For account erasure, clear active profile pointers, delete builder versions and sessions first, then matching reports/JD snapshots, profile versions, baselines/documents and user records. Foreign-key restrictions intentionally prevent accidental removal of evidence references.

## Validation

Executed: **62 CareerPilot native tests**, **162 existing regression tests**, syntax transforms and four affected browser bundles. Real document tests validate DOCX XML/A4/no-table structure, editable Unicode text, both PDF templates, embedded-font searchable text, multi-page preservation, exact metrics and explicit missing-glyph failure. Builder tests cover whole-fact preservation, professional/project scope, unsupported metrics/skills, accepted/rejected/edited proposals, chronology, section/skill permutations, manual draft blockers, date inconsistency and source page evidence.

Added PostgreSQL integration coverage for original bytes before/after generation, owner isolation, review requirements, unsupported drafts, approved versions, document re-extraction, optimistic conflicts, restore history and database immutability. Added Playwright coverage for review/edit/draft/approve/download/restore against actual persistence; the AI proposal boundary is an explicit seeded fixture. Actual configured-provider output still requires a deployment smoke check.

Full lint/type/build/migration and browser execution remain **unverified**: Prisma, ESLint, tsx and Playwright Test are absent, and npm installation fails with DNS ENOTFOUND. Native integration discovery runs but all four database scenarios explicitly skip without an isolated `*_test` PostgreSQL connection. No database/browser/production readiness claim is made from those skipped/blocked checks.

Primary document references: [docx](https://docx.js.org/), [jsPDF custom TrueType/Unicode support](https://github.com/parallax/jsPDF), [PDF.js](https://github.com/mozilla/pdf.js).
