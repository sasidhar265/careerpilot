# JD analysis and evidence matching

## Implemented workflow

1. Confirm a master in Candidate Profile. The match selector includes only immutable reviewed profile versions with their associated master resumes; generated/unreviewed text does not establish facts. The active master appears first.
2. Supply pasted JD text (50–45,000 characters), a selected Discover Jobs listing, or an exact employer URL already present in the collected catalogue. The service snapshots the stored listing description/requirements. Arbitrary URL fetching is deliberately unsupported: no user-controlled SSRF request, authentication bypass or invented fetch success.
3. The configured actual AI provider extracts a strict requirement schema. Every criterion must be a verbatim substring of its exact JD quote; title evidence is checked too. Categories cover technical tools/frameworks, experience, responsibilities, education, certifications, domain knowledge, leadership, eligibility and explicitly stated sponsorship. Unsupported output fails visibly. AI never chooses the candidate score.
4. Review the checklist against the full JD: mandatory vs preferred vs unspecified, qualifiers, alternatives and completeness. The UI requires explicit review before scoring. Incorrect extraction requires corrected source/re-extraction; there is no silent acceptance of omitted qualifiers. Each extraction creates an immutable JD version.
5. A deterministic engine compares the exact confirmed profile, saves an immutable report with its inputs/weights/hashes, and presents strengths, partial matches, unverified gaps, explicit contradictions, improvement recommendations and evidence links. Load prior reports from paginated history.
6. Generate a separate tailored resume by moving relevant existing entries earlier. This is deterministic evidence prioritization, not a claim that AI rewrote the resume. All confirmed values and all sections remain present; no facts are added. Repeating the action reuses the same artifact. Review/export through existing PDF/DOCX routes. The original baseline and active selection are unchanged.

## Evidence rules and limits

Algorithm identifier: `evidence-literal-v1`. Confirmed means user-reviewed, not independently authenticated with an employer or licensing body. Every positive/partial match references stable fact IDs, section/entry IDs, exact confirmed value, original evidence quote and offsets/page when available. User-provided corrections without original evidence are labelled `user`. Snapshots retain exact resume/profile/JD SHA-256 hashes and database IDs.

Literal, case-normalized, boundary-aware comparison establishes exact technology mentions only in compatible confirmed sections. Semantic similarity, aliases, inferred date arithmetic, inferred recency, implied years and generic responsibilities do not establish facts. Negation, aspirations and basic exposure are conservatively excluded. Qualified requirements (advanced proficiency, years, production scope, compound alternatives etc.) receive partial rather than full credit from bare technology mentions. A complete literal credential/statement can receive full credit in its compatible section only when the source quote adds no substantive qualifiers. This can under-credit qualified candidates; the UI explains that scope/duration/equivalence needs review.

Experience and domain alignment use their own components; ambiguous statements remain partial or not evidenced. The engine does not sum overlapping roles, infer full-time employment, convert year-only dates into months, or infer degree equivalence. It does not independently verify legal rights. A mandatory eligibility blocker requires a narrowly recognized explicit confirmed denial matching the condition; absent eligibility evidence is never a blocker. Other contradictory or complex eligibility wording remains unverified. Employer sponsorship statements are always informational and never candidate eligibility proof.

This engine relies on a user-reviewed AI-extracted checklist. Verbatim grounding cannot itself prove correct requirement classification, completeness or qualifier scope; the review step is necessary. It does not claim complete natural-language understanding or an official ATS score.

## Scoring

Category defaults per requirement: technical 30, experience 20, domain 10, education 8, certification 8, leadership 8, responsibility 10, eligibility 6. Sponsorship is excluded (0). Mandatory factor is 1, preferred 0.35, unspecified 0.5. Met earns 1; partial earns 0.5; not evidenced and explicit blockers earn 0. All factors/weights except mandatory factor and informational sponsorship are editable within bounded ranges and persisted with the report.

`possible = category weight × priority factor`

`earned = possible × status credit`

`compatibility = round(100 × sum(earned) / sum(possible), 1)`

No positive denominator yields an unscorable result, never a fabricated zero or perfect score. Component scores use their own denominators. Mandatory/preferred coverage counts full, partial, not-evidenced and blocked requirements separately. Blockers are displayed separately and cannot be overridden by a high score. Duplicate criteria are deduplicated case-insensitively and promoted to mandatory if explicitly extracted that way, avoiding duplicate score inflation. Requirement counts affect category contributions because category weights apply **per requirement**; this is disclosed in the UI.

## Persistence, API and configuration

Apply additive migration `202610220005_evidence_matching` after the baseline migration. New tables: `JobDescriptionVersion`, `MatchAnalysis`. Database triggers guard immutable snapshots, owner consistency, confirmed profile/resume association and generated-artifact ownership. `sourceJobId` is historical provenance rather than a cascading relationship: deleting a collected listing cannot erase a JD snapshot. No existing records are replaced or backfilled with invented analyses.

- `POST /api/matching/extract`: exactly one of `jobDescription`, `jobId`, `url`; actual configured AI service and its daily quota/error behavior.
- `POST /api/matching/score`: `resumeId`, `jdVersionId`, `requirementsReviewed: true`, optional bounded scoring settings. No AI call is needed here. Up to 200 new reports/day/account.
- `GET /api/matching?before=<owned-analysis-id>`: owner-only summaries, 20/page.
- `GET /api/matching/:id`: full owned snapshot/report.
- `POST /api/matching/:id/tailor`: empty JSON object, idempotent generated artifact.

All writes enforce same origin, bounded JSON and authenticated ownership. Reads are private/no-store. The retained `/api/ai/match` compatibility endpoint now returns HTTP 202 with a saved checklist and `requiresReview` on its initial request. Subsequent reviewed requests must supply its JD version ID and `requirementsReviewed: true`; it uses the same persisted scoring/tailoring services, not the old free-form report. Clients must handle this review step.

No new AI secret/provider integration is introduced: configure the existing AI provider, database and authentication from the application README. Structured outputs are checked by the shared strict provider JSON schema and server-side bounded validators; Zod validates requests/configuration. Candidate profiles are never sent to AI for scoring. JD text is transmitted to the configured provider and stored in existing private AI audit records. Infrastructure database encryption/TLS/access controls remain required for these private texts.

For account erasure, delete matching reports and JD versions **before** profile versions, baselines, documents and user records (clear active pointers first), because evidence references intentionally restrict accidental deletion.

## Tests and release gates

Executed: 46 CareerPilotAI native tests and 161 existing regression tests. New cases cover exact evidence, partial qualification, mandatory/preferred factors, category weighting and zero denominators, negation/aspiration, no semantic promotion, literal punctuation/boundaries, explicit-only eligibility blockers, sponsorship exclusion, unsupported JD evidence/title, duplicate criteria, pending profiles, invalid scoring and claim-preserving tailoring. App/config/test syntax transforms and browser bundles pass.

Added a real-PostgreSQL integration scenario for exact versions/hashes, owner isolation, immutable reports/JDs, configured AI-boundary failure, unsupported URLs and idempotent tailoring. Added a browser scenario for checklist review, score/evidence UI, owner isolation, history and exports; only AI extraction is substituted with an explicit persisted test fixture, while scoring and persistence call the real backend.

Full typecheck/build/migrate remain blocked at unavailable Prisma; lint at unavailable ESLint; integration at unavailable tsx; browser tests at the missing Playwright Test runner. Dependencies could not be installed previously because npm DNS access fails. These tests are implemented but database/browser execution is not claimed. Run all release checks against a migrated isolated `*_test` database after dependency installation.
