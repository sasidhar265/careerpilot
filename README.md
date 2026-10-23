# Align — Resume Studio

Five-stage resume tailoring with OpenAI-powered analysis and rewriting.

## Setup and run

Requires Node.js 22.12+ (or 24+) and internet access.

```sh
npm install
cp .env.example .env
```

Edit `.env` in the project root and set `OPENAI_API_KEY` to your OpenAI API key. Startup resolves configuration relative to the project, even when launched from another directory. It also supports `server/.env` and `.env.local`; `.env.local` takes precedence over `.env`, which takes precedence over `server/.env`. A nonempty environment variable takes precedence over files. `.env.example` is only a template and is not loaded. The default model is `gpt-4.1`; change `OPENAI_MODEL` to a compatible Responses API model supporting Structured Outputs if needed. Keep the key server-side: never prefix it with `VITE_` or paste it into the UI.

```sh
npm run dev
```

Open the Vite URL. This command starts the local Node API on port 3001 under Node file-watch mode and Vite with an `/api` proxy. Changes to imported backend modules automatically restart the API during development. API requests need OpenAI API access and billing; this app uses API credentials, not a ChatGPT website session. If you change `.env`, restart the app.

`npm run build` followed by `npm start` runs a production preview with the AI backend. Use `npm run dev` for development; running Vite alone does not start the backend.

If analysis reports the backend is unavailable, stop any old app processes and restart with one of those commands. A missing API key produces a separate configuration message.

`npm test` runs local tests using mocked AI responses. `npm run build` generates the frontend; a deployment must also run the Node backend and forward `/api` to it. The supplied server binds to localhost and is designed for local use, not an unauthenticated public service.

## Workflow

1. Paste or upload a job description. OpenAI extracts the role, keywords, responsibilities, and qualifications.
2. Review the analysis, then paste or upload your resume.
3. OpenAI compares experience contextually and proposes edits with quoted resume evidence. Keyword coverage is still calculated locally and is not an employer ATS score.
4. Select supported suggestions and click **Update resume**. The selected provider rebuilds the entire resume around the role, using selected edits as priorities. Suggestions without exact supporting evidence are marked as requiring your input. With no edits selected, the provider still creates the full tailored resume.
5. Review/edit the generated text, preview, and download PDF or DOCX.

Prompts require preservation of factual history and prohibit invented skills, credentials, employers, dates, achievements, and metrics. These instructions and evidence checks reduce unsupported edits but do not guarantee factual accuracy: review the complete generated resume before use.

## Data and documents

PDF, DOCX, JPEG, and PNG files are extracted in the browser; English Tesseract OCR handles images and scanned PDFs. Upload limit: 20 MB. Attachments remain separate from the paste-text box and are read only when Analyze is clicked. Any pasted text is included alongside the attachment. Attachments can be removed or replaced before analysis. OCR downloads language assets on first use. Exports use single-column formatting rather than preserving uploaded layouts. PDF uses Helvetica with limited non-Latin support; DOCX supports Unicode.

When Analyze or Update is clicked, the extracted job description and resume text needed for that operation are sent through the local backend to OpenAI. This app does not persist documents or log their contents. Responses requests set `store: false`; this does not override OpenAI's API data retention policies. Fonts and OCR assets also require network access.

## Implementation

- `server/ai.js`: Responses API requests, schemas, prompts, input validation, evidence checks, and error handling.
- `server/index.js`: local HTTP API and request limits.
- `scripts/dev.mjs`: starts the backend and Vite together.
- `src/ai-client.js`: browser calls to the backend, never directly to OpenAI.
- `src/main.jsx`: five-stage user flow.

Official references: [Responses API](https://developers.openai.com/api/docs/guides/responses), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1).

## Codex CLI provider

Select **Codex CLI** in the AI provider dropdown to analyze jobs, compare resumes, and rewrite using selected suggestions. OpenAI API remains available in the same dropdown. To default to Codex, set `AI_PROVIDER=codex` in `.env` and restart.

Install the CLI if needed, then log in on the machine running the backend:

```sh
npm install -g @openai/codex
codex login
codex login status
npm run dev
```

`CODEX_CLI_PATH` optionally specifies the executable path. `CODEX_MODEL` optionally selects a model; when blank, Codex uses its built-in default. This adapter ignores user configuration but retains the CLI authentication store. The app's `OPENAI_API_KEY` and `CODEX_API_KEY` are excluded from the child process so that it uses the existing CLI login. Your login needs Codex access and remains subject to plan/network/usage limits.

The backend passes prompts via stdin, invokes `codex exec` without a shell, requests schema-constrained output, and runs in a fresh temporary directory with a read-only sandbox and approvals disabled. It does not grant access to the project workspace. Ephemeral sessions and temporary-file cleanup minimize local retention, but supplied text is sent to the Codex service. Each operation times out after three minutes. Both providers apply the same evidence checks. This is a local Node backend capability, not available on a static-only deployment.

Official references: [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [Codex authentication](https://learn.chatgpt.com/docs/auth).

## GitHub Copilot and provider usage checks

The provider dropdown also supports **GitHub Copilot** through its local CLI. Install the official CLI and run `copilot login` on the backend machine. Use `COPILOT_CLI_PATH` for a custom binary path. When Copilot is selected, choose a model from the signed-in account’s runtime model list. Haiku, Sonnet, Opus, and other models appear only when returned by the account and not disabled by policy. Selection is required before analysis, rewriting, or employer reviews; the server rechecks availability before each request. The chosen model overrides the optional `COPILOT_MODEL` backend default, and refreshing providers recalculates quota for that selection. A headless setup can provide `COPILOT_GITHUB_TOKEN` server-side.

Before displaying enabled provider options, the app checks installations/access and requests account limits. It refreshes before each AI operation and offers a manual Refresh control. Uninstalled, inaccessible, or known exhausted providers block Analyze. Providers remain selectable so their reason can be inspected. Copilot permits continued usage when its account quota explicitly allows it; this may incur charges under the account billing settings. Checks do not send resumes or trigger model inference.

- Codex: app-server `account/read` and `account/rateLimits/read` return login and quota windows, including percentages and reset times.
- Copilot: the CLI's headless JSON-RPC surface exposes `account.getQuota` and `models.list`, as used by the official SDK. Relevant allowance, usage, percentages, and reset dates are shown when available. This protocol may evolve; unsupported versions produce an explicit unknown result.
- OpenAI API: a model-access lookup verifies credentials/model access. A standard app API key cannot verify remaining account credits beforehand. The UI explicitly shows unknown limits, reports token counts from completed requests, and blocks known quota failures for a short cooldown. No balance or unlimited quota is invented.

Unknown limits remain selectable with an explicit warning; unknown is not a guarantee of successful inference. Quotas can change after a check. Account checks and CLI calls require network/login access on the server machine. Copilot runs with all tools denied, builtin MCPs disabled, no custom instructions, and a temporary working directory. The installed CLI may retain its own sessions according to its settings.

## Resume evaluation

After **Analyze resume**, the evaluation section provides a qualitative fit summary, strengths, requirement-by-requirement evidence, gaps, concrete recommended actions, and prioritized next steps. Evidence must quote the supplied resume exactly; unsupported positive assessments are changed to missing evidence. Generated text still needs human review. The improvement suggestions below that section show original evidence and proposed wording, and can be selected as priorities for Generate full tailored resume.

References: [GitHub Copilot usage and billing APIs](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/usage-and-billing), [Codex app-server limits](https://learn.chatgpt.com/docs/app-server).

## Complete tailored resumes and traditional formatting

Generation returns structured candidate information, a targeted professional summary, relevant skills, complete reverse-chronological experience with action-led bullets, education, and factual additional sections. The backend converts this to editable text with standard section headings. Unresolved questions stay in separate review notes and are excluded from exports. Prompts prohibit invented credentials, job titles, dates, metrics, tools, and experience. Review all output before applying.

The formatted preview, PDF and DOCX use a common semantic resume parser. They distinguish name/contact, section headings, role/degree titles, employer/institution metadata, paragraphs, and bullets. Exports use single-column A4 pages with readable standard fonts and no tables, icons, text boxes, or graphics. PDF pagination keeps section headings with following content; DOCX uses paragraph keep-next rules and native bullet lists. Layout is consistent in structure, though browser/PDF/Word font metrics may result in different pagination.

`test-fixtures/tailored-resume.json` contains synthetic test data, not the user's experience. `validation/ats-format-example.pdf` and `.docx` demonstrate the formatting only. Export tests reopen generated documents to verify content and order, and test pagination for long experience sections.

## ATS-friendly tailoring and before/after estimates

The **ATS-friendly AI tailoring** option is enabled by default beside the generation controls. It adds instructions shared by all three providers for standard headings, compact skill points, clear experience bullets, and accurate JD terminology without invented qualifications.

An **ATS friendliness estimate** appears after analysis and compares the original and current tailored text during review/download. It refreshes as the tailored text is edited. The same local rubric scores both versions: 70 points for distinct reviewed JD keyword coverage and 30 points for six equally weighted text checks (name, contact, experience heading, skills heading, experience bullets, employment dates). Duplicate keywords and repeated mentions receive no extra credit. No overall score is shown without JD keywords. This heuristic is not an employer ATS result, qualification verification, hiring probability, or inspection of the original uploaded file layout. Scores stay outside resume exports.

## Employer-focused application review

After analysis and tailoring, the app makes an additional AI request to assess each distinct reviewed JD criterion contextually. The same qualification, responsibility and skill criteria are used before and after tailoring. App-defined weights are 3, 2 and 1 respectively, with full credit for supported evidence, half for partial support and zero for absent evidence. The server calculates this estimate after checking exact quotes against both the assessed resume and the original facts. These checks reduce unsupported claims but do not verify the truth or completeness of a quote's interpretation.

The review shows requirement-by-requirement evidence, explicitly required gaps, and concrete next actions. It distinguishes absent resume evidence from a qualification the candidate lacks. Editing the tailored text invalidates its review; use **Recheck employer fit** for a new AI assessment. Review failures leave the generated resume available and show a retry option. Provider usage applies to these extra requests.

This review does not access an employer's ATS, calibration, screening questions or application outcomes. Confirm eligibility conditions and answer application questions truthfully. For example, [Greenhouse application rules](https://support.greenhouse.io/hc/en-us/articles/360000653472-Auto-reject) can reject based on application answers, and [Greenhouse Talent Matching](https://support.greenhouse.io/hc/en-us/articles/41396009937307-Talent-Matching) uses employer-defined calibration. Resume parsing is a separate concern: [Greenhouse's parsing guidance](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse) documents formatting issues. All estimates remain outside resume exports.

Copilot checks first complete the SDK connection handshake and inspect `auth.getStatus`, then verify model access and quota separately. A missing login disables the provider with a `copilot login` instruction; quota-service failures retain verified model access while clearly marking limits unknown. Temporary check directories keep CLI logs outside the project and are removed after each check. After signing in, restart the app or use **Refresh**. See [Copilot CLI authentication](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli).

Copilot quota checks ignore inactive zero-entitlement credit buckets and do not confuse chat/completion allowances with CLI inference allowance. Conflicting remaining counts/percentages, conflicting active buckets, missing continued-usage flags, and expired snapshots leave usage enabled with an explicit unknown status. A hard quota block requires a current active allowance that is exhausted and explicitly denies continued/overage usage. Runtime model billing metadata is considered for zero-premium-cost configured models; no model price is inferred from its name. Actual provider rejections remain authoritative.

If the normalized Copilot quota RPC supplies no usable inference allowance, the app also checks the runtime's subscription snapshot and accepts its documented balance/entitlement fields. Only whitelisted quota fields leave the backend; authentication objects, tokens and account identities are excluded. **Copilot quota details** shows the source and normalized values for troubleshooting. No credit/currency conversion is inferred. Verified login/model access with unknown limits still permits analysis, subject to the CLI's actual access and billing checks.

Copilot inference now explicitly requests the CLI's machine-readable JSONL output and parses only the final full `assistant.message`. Echoed document input, streaming deltas, reasoning and CLI statistics are ignored. Legacy plain/fenced JSON and a single JSON object surrounded by commentary are also accepted, but all required fields, field types and enums must match the operation's schema. Failed sessions, truncated output and conflicting JSON objects are rejected. A malformed result gets one fresh formatting retry within a total three-minute budget; this can consume another provider request. Temporary directories are cleaned up on success and failure. See [Copilot CLI programmatic output](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-programmatic-reference).

ATS-friendly tailoring targets an 80/100 text-based estimate when the original experience supports it. The shared provider prompt receives calculated keyword and structure feedback. A draft below target gets at most one additional rewrite using the original resume as the factual source; the app retains the higher-scoring result and preserves the first draft if refinement fails. This can use one extra inference. The score rubric is unchanged, and employer-fit reviews still check original evidence independently. Reaching the estimate target does not guarantee an employer ATS outcome.

Suggested changes start unselected. Accept individual changes, then use “Accept selected changes & update resume” to apply them during full tailoring. Manual edits remain a draft until “Save edits & recheck ATS” is clicked; scores and exports use the saved resume. Saving immediately recomputes the ATS estimate and refreshes employer evidence when AI access is available. At 80 or above, the saved resume displays a final-review prompt; employer gaps still require review. A status popup summarizes every running document, AI, provider-check, and export task without showing document contents.

The sidebar’s Resume history adds a resume to browser local storage only when the user clicks Save final resume or successfully exports a PDF/DOCX. Generating, tailoring, accepting suggestions, and applying text edits do not create history entries. The latest 10 finalized resumes are retained; up to 10 drafts stored by earlier versions remain accessible. History includes resume text, original source text, reviewed JD, review notes, and save time; it is local to this browser and origin, not synced to an account. Reopening restores the saved resume and job context and requires a fresh employer review. Repeated saves of identical content and context are deduplicated. Storage errors preserve session history and display a message. Each record can be removed from the history dialog.

Resume analysis and every tailoring pass use the senior recruiter review instruction for the company identified in the job description. The review includes an original-resume match estimate out of 100, up to five supported missing keywords or qualifications, and up to three evidence-based rapid-screen red flags. Fewer findings are reported when the source does not support the requested count. Analysis shows these in the evaluation; tailoring includes them in review notes. The recruiter estimate is separate from the calculated ATS estimate.

After CV analysis, **Generate NHS supporting information** creates an editable first-person application statement from the original CV and JD. Include the person specification and organisation values in the JD input. Choose a maximum of 100–3,000 words (default 1,500); missing evidence and candidate questions appear separately. Download the reviewed statement as text; review notes are excluded. Available with all configured AI providers.

## UK job search and applications

The workspace opens to job search. UK openings are collected from public Greenhouse, Lever, Ashby and SmartRecruiters employer boards without API keys, alongside an optional official NHS Jobs XML/RSS feed. The former paid-aggregator integration has been removed. **Source** filters collected results by provider; there is one search workflow rather than separate live/provider modes.

The built-in directory contains 21 configured feed candidates and 19 careers-site-only employers (40 employers in total). It covers UK technology businesses and international companies with UK IT roles. Examples of configured feeds include Monzo, GoCardless, GitLab, Grafana Labs, Zopa, Version 1 and Endava. Collection begins when the backend starts. Coverage depends on configured employers and available UK vacancies; this is not an exhaustive national index. **Job sources & freshness** shows refresh successes, counts and failures. **Refresh sources** updates configured boards manually.

### Source configuration

Restart the backend after changing server-side `.env` settings:

```dotenv
JOB_EMPLOYER_BOARDS='[{"provider":"greenhouse","board":"monzo","company":"Monzo"},{"provider":"lever","board":"spotify","company":"Spotify","region":"global"},{"provider":"ashby","board":"incident","company":"incident.io"}]'
JOB_REFRESH_MINUTES=60
JOB_AUTO_REFRESH=true
NHS_JOBS_FEED_URL=
```

Board identifiers come from employers' public careers URLs. Up to 200 board entries are supported per configuration/custom directory. Lever accepts `region: "global"` or `"eu"`. An unset board setting uses the starter list; `JOB_EMPLOYER_BOARDS='[]'` disables employer collection. Settings load from `.env`, `.env.local`, or `server/.env`; nonempty inherited environment values take precedence. Old aggregator credentials and query settings are ignored.

Automatic refresh runs while the backend is open, every 60 minutes by default (15–1,440 minutes supported). `JOB_AUTO_REFRESH=false` retains manual refresh only. Concurrent refreshes share one run, with a one-minute cooldown. A shared 90-second run budget, three concurrent workers and per-request timeouts bound collection. Budget-limited runs rotate to the next unchecked employer on subsequent refreshes. Lever fetches at most five pages of 100 postings per board; the other initial employer responses are capped at 10 MB. SmartRecruiters fetches up to five pages of 100 public UK postings, then requests details for the first 30 UK postings; remaining postings or detail failures retain labelled summaries. SmartRecruiters requests are paced across sources, and rate-limit responses block subsequent requests until the retry window. A large or slow board set can exceed the run budget. Failed sources retain their earlier listings and timestamps.

[NHSBSA's self-serve guidance](https://www.nhsbsa.nhs.uk/about-nhs-jobs/nhs-jobs-integration-and-benefits) describes official XML/RSS feeds, primarily for employers displaying their listings. Set a valid permitted feed URL in `NHS_JOBS_FEED_URL`; no endpoint or employer code is invented. The adapter supports RSS, Atom and simple job/vacancy XML with common field names. Only HTTPS jobs.nhs.uk URLs are fetched; redirects, DTD/entity declarations, and payloads over 5 MB are rejected. Verify compatibility with the current configured feed. NHS Scotland and Northern Ireland remain external search links. Public endpoint access and reuse remain subject to source/provider terms.

Provider documentation: [Greenhouse](https://docs.greenhouse.io/job-board), [Lever](https://github.com/lever/postings-api), [Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api), [SmartRecruiters](https://developers.smartrecruiters.com/reference/v1listpostings).

### Search and rendering

Search supports keyword, location, provider, exact employer name, annual minimum salary, date posted, contract, NHS keyword, and relevance/date/salary sorting. It updates after a short typing pause. Keywords match words across title, employer and description, including testing/automation variants. Relevance prioritizes title matches. Locations use text matching with no postcode radius calculation. Explicit country metadata and conservative city matching restrict employer feeds to UK roles; ambiguous locations still need review and remote roles with no UK eligibility are excluded. Source salaries must be explicitly annual GBP amounts; no salary conversions or posting dates are invented. Greenhouse update dates are distinct from posting dates. Unknown metadata cannot satisfy restrictive filters.

Results appear directly below search controls and submitting Search scrolls there. Keyword counts and exclusion diagnostics explain empty results. **Clear other filters** retains the keyword and resets provider/other controls; **Show keyword matches without other filters** additionally includes source-expired listings. **Show hidden matches** reveals hidden jobs without altering tracker preferences. Full descriptions are expandable and rendered as text. Some sources supply excerpts; inspect the original advert and NHS person specification before analysis. Source links remain available on every job.

### Collection, duplicates and freshness

Collected listings persist in gitignored `.data/jobs.json`, independently of browser history. Writes are serialized and atomically replaced, with a maximum of 10,000 most recently observed records. This is a single-backend local store. Corrupt files are not silently overwritten. The catalogue stores job data/source summaries, not credentials, resumes or tracker notes. Legacy removed-provider records are excluded from active search, source health and freshness lookups without deleting saved application notes or modifying the original catalogue records destructively.

Equal source references or canonical listing URLs merge, retaining provenance, first-seen time and source aliases. Common URL tracking parameters/fragments are removed; meaningful parameters remain. Identical job titles at different URLs stay separate. Full descriptions take priority over excerpts.

**Recently seen** means observed within seven days; **Stale** means no observation for more than seven days. **Past source closing date** requires an explicit source closing date and applies after that UTC calendar day ends. Missing results or source failures never prove a job has closed. Expired listings are excluded from search by default but remain available for tracker lookups. Observation status never changes application status or the user's dates.

### Saved jobs and application tracker

Search cards support saving, hiding, marking Applied, and **Prepare application**. The tracker supports Saved, Applied, Interview, Offer, Rejected and Withdrawn statuses, notes, closing dates and application dates. **Add a job** accepts NHS or other vacancies manually with a source URL and full description. **Hidden** in the tracker restores visibility. Removing a record requires confirmation. Unsaving from search removes it from the saved view while retaining the record's notes/status in browser storage.

Preparing a job opens its saved description in Resume Studio and saves the opportunity without submitting an application. Replacing existing job/tailoring work requires confirmation and keeps the resume input. Finalized resumes remain separately in Resume history. **Check listing freshness** reads source observations from the server catalogue without changing saved descriptions or notes.

Tracker records use browser local storage (`align-job-tracker-v1`), are not account-synced, and disappear when browser data is cleared. Storage failures retain session changes and show an error. Dates are user-maintained and have no notifications.

### Validation

Tests cover feed normalization, UK filtering, persistence/restart, failed refreshes, concurrency, deduplication, freshness, API routes, source configuration and component interactions from keyword entry through request handling to card rendering. Search timeouts and invalid backend responses show explicit errors. Browser automation is blocked by this development sandbox; tests use synthetic/mock feeds. Actual source availability is shown by the runtime source health panel.


## UK technology employer directory

Expand **UK technology employer directory** below search results to inspect the built-in employers, current observed UK listing counts, enabled feeds and careers links. The 21 configured feeds are candidates for live validation: only a successful runtime refresh establishes current API access. Counts exclude known source-expired listings. Clicking a listing count searches that employer and clears other filters. Employers without supported connected APIs show **Careers link only** / **Not collected**, rather than fabricated vacancies or an implied full-data integration.

**Connect another employer** accepts its public Greenhouse, Lever, Ashby or SmartRecruiters board URL and employer name. It validates the platform hostname and board slug, saves the connection to gitignored `.data/employers.json`, and refreshes sources. New connections work without a backend restart and are combined with the built-in or environment-configured boards. Duplicate platform/board/region entries update the saved employer name instead of collecting twice. Direct HTML crawling, Workday/SuccessFactors integrations requiring employer-specific access, and automated enumeration of every UK IT company are not implemented. Company career links let users access those employers directly.

The directory is an expandable curated starting point, not a complete census of UK IT employers or a guarantee of vacancies. Existing source terms and location/metadata limits still apply. Automatic refresh also depends on the backend running. For defaults, leave `JOB_EMPLOYER_BOARDS` unset/blank; a nonempty JSON setting overrides the built-in feed set, and an empty JSON array disables it. UI-added employers remain enabled independently. Keep `.data/employers.json` if moving this local backend to preserve custom connections.


Cache maintenance: `.data/jobs.json` holds collected vacancies and source refresh summaries; deleting it clears the job catalogue without deleting `.data/employers.json`, browser resume history or application notes. Catalogue reads detect disk deletion/replacement and invalidate the loaded in-memory snapshot. `node_modules/.vite` is a disposable frontend development cache. The UI polls source health every 30 seconds (three seconds during a running background refresh) and reloads current search results when the catalogue revision changes. Employer counts follow the same revision, and search results display the last listing update time. Failed-source metadata updates do not advance that listing update timestamp. Development mode now watches backend module changes; an already-running process from the earlier launcher must be stopped and restarted once to use the watcher.

## CareerPilot AI — Next.js foundation

The new application lives in [apps/careerpilot](apps/careerpilot/README.md) on port 3100, with PostgreSQL, Prisma, secure OIDC login, owner-scoped private data and the CareerPilot AI shell. The existing app and root commands remain supported. See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for scope, acceptance criteria and verification progress. Install the new package separately before using `npm run careerpilot:dev`; no existing data is automatically moved or deleted.

CareerPilot's expanded job discovery module, provider setup and validation limits are documented in [docs/JOB_DISCOVERY.md](docs/JOB_DISCOVERY.md).
