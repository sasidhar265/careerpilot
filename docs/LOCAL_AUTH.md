# Local file-backed authentication

Implemented as an explicit alternative to OIDC for **local development only**. It removes PostgreSQL and identity-provider requirements for account creation, login, session retrieval and logout. It does not replace the PostgreSQL persistence layer for career records. File users and OIDC users are separate; no account/data linking by email is performed.

## Use

The app-local `.env` has been configured with `AUTH_MODE=file` and a localhost APP_URL. No account or password was created automatically. After installing the app dependencies, run `npm run careerpilot:dev`, open `http://localhost:3100/`, and choose **Create account**. Registration opens a modal with name, email, password and confirmation (minimum 12 characters). **Sign in** opens a separate modal with only email and password. `/login` remains a compatibility redirect to the landing sign-in modal. Multiple local accounts are supported up to a 100-account installation limit; normalized duplicate emails are rejected atomically. The legacy first-account-only API remains guarded for compatibility, but the landing registration action uses explicit registration.

The default path is `apps/careerpilot/.local/auth/accounts.json` when starting through the app npm scripts. `AUTH_FILE_PATH` can override it; relative paths are relative to the app process working directory. The directory must be private (0700), and account files private (0600). Symlinked account files are rejected. Private runtime folders are excluded from Git and Docker context. Keep the path outside any public/static directory. Do not copy these files into a published image or commit their hashes/sessions.

Login redirects to `/local-account`. It displays the actual signed-in account, persistence limitations, workspace setup and a real logout action. Database-dependent workspace pages redirect there instead of crashing. Private APIs still require authentication; career mutations are not reimplemented in JSON. To use the full workspace, provision PostgreSQL/OIDC and switch `AUTH_MODE=oidc`, then restart. Existing database records are preserved. Local credentials do not grant access to any OIDC user's records.

## Security and storage

Passwords use independently salted scrypt (N=32768, r=8, p=1), not plaintext or reversible encryption. Tokens are random 256-bit values; only SHA-256 token hashes are stored. Sessions expire after eight hours, persist across process restarts and are removed on logout. Cookies use HttpOnly, SameSite=Lax and Secure on HTTPS. Form requests require the exact configured origin and bounded URL-encoded bodies. Unknown accounts use a dummy password derivation. A persisted global limit permits 25 authentication/registration attempts per 15 minutes; login attempts and valid registration submissions, including duplicates, count. This intentionally conservative limit suits a single local account, not a public SaaS.

Writes use an exclusive lock directory, mode-0600 temporary file, file sync and atomic rename. A crash can leave a stale `.lock` directory: stop all app processes, back up the private directory and remove only that empty lock after verifying no writer remains. Never delete the accounts file to bypass a storage error. Corrupt or permissive storage fails closed; no automatic reset occurs. Lost-password recovery and account-administration controls are not implemented. Registration is available only in this local development mode; email ownership is not externally verified. Back up the account file privately; deleting it invalidates access and allows first-account creation again, so filesystem access is a trust boundary. Filesystem encryption remains an OS responsibility.

`AUTH_MODE=file` rejects production NODE_ENV and non-loopback application origins. Keep the development server bound to a trusted machine/network; APP_URL validation is not a network firewall. This mode is not offered for publicly hosted or distributed production deployments. OIDC remains the production authentication path.

## Verification

Native tests cover real on-disk registration, hashing, permission bits, login, process-independent session retrieval, expiry, logout, persisted throttling, weak passwords, concurrent setup, symlink rejection and corrupt-file failure. Configuration tests check production rejection and skipped OIDC requirements in local mode. The Playwright config uses an isolated temporary private directory and no database: `npm --prefix apps/careerpilot run test:e2e:local-auth`. Its updated UI scenario covers separate landing dialogs, two-field sign-in, Escape/focus return, real registration, redirect, refresh, bad password, logout/login and cross-origin rejection. The browser runner now starts but cannot launch its web server: the environment rejects listening on a local port with EPERM. Next startup also fails on 127.0.0.1:3100. Lint passes. Typecheck/build stop during Prisma generation because binaries.prisma.sh cannot be resolved; generating the existing client needs network access, not a running database. Source parsing is not type checking.


## Landing authentication dialogs follow-up

Registration and sign-in now share an accessible native-dialog component, with labelled fields, modal focus handling, Escape/close behavior, disabled pending controls, inline errors and actual JSON-backed form submission/session cookies. Passwords never enter URL query parameters. OIDC mode retains its real provider handoff inside the dialog; it does not pretend to verify email/password locally. Existing OIDC callback error redirects and private-page login links resolve to the landing sign-in dialog.

Verification: 91 native app tests pass, including new multi-account/duplicate/session-isolation cases. Lint, an isolated TypeScript check of the dialog and its UI dependencies, and a browser bundle check pass. This isolated check does not establish a full application type/build pass. The browser scenario remains blocked by local socket permissions.


## Registration browser-pattern error correction

A reported “The string did not match the expected pattern” was traced to the account API importing the universal session module, which pulled in a missing generated Prisma client. Next returned an HTML compilation error; the modal exposed a raw JSON/browser exception. Local authentication is now a complete dependency boundary: common cookie policy in `auth/cookies.ts`, file-only session lookup/revocation in `auth/local-session.ts`, registration at `/api/auth/local`, and local logout at `/api/auth/local/logout`. The local-account page/menu use those file-only operations. Existing OIDC/database session implementation, stored accounts and cookie names/lifetimes are preserved. Career data modules still require their database setup.

The modal now validates the server response before navigation, sanitizes non-JSON/network/browser errors, captures form serialization failures, and uses an AbortController timeout without requiring AbortSignal.timeout support. No password-format restriction was added to work around the browser error.

Verification commands: `npm --prefix apps/careerpilot run test:auth:local` invokes the actual registration/sign-in handler, real NextResponse cookie implementation and actual client response parser against a temporary private store, with DATABASE_URL empty. It verifies genuine success/session retrieval, special characters/Unicode passwords, duplicate email, wrong password, mismatched confirmation and cross-origin rejection. It never reads/writes real account files. `test:auth:compile` compiles the real modal, local account page, registration and logout routes with Next/Turbopack without a generated Prisma client or database. These are distinct from browser end-to-end verification, which remains blocked by localhost listen EPERM.


## Local origin aliases

File-auth development accepts same-origin browser requests through `localhost`, `127.0.0.1` and IPv6 `::1` when they use exactly APP_URL's protocol and port. This fixes creating an account after opening the server by its IP instead of the configured localhost name. Origin must still match the request's actual authority; arbitrary forwarded-host headers are not trusted. Missing/null origins, foreign sites, cross-site fetches, wrong ports and changed protocols remain rejected. Production and OIDC keep the exact configured-origin policy. Local native-form success/error and logout redirects retain the authorized browser origin, preserving host-only cookies. Guest requests reuse the same scoped local policy.

The actual-handler check `test:auth:local` now verifies creation/login on the IP alias, stored-session retrieval, same-origin native redirects, wrong-port rejection and production alias rejection. Native origin tests cover all loopback variants and forged/malformed headers. The browser suite also checks IP registration/cookies/logout and blocked requests from a different origin, but rendered verification remains subject to localhost-port restrictions. Use the configured APP_URL if opening the app on any other host/port.


## Signed-in and visitor interfaces

Signed-in local accounts no longer display guest links, promotions or guest data messaging. The landing page resolves the actual session before choosing account controls or visitor sign-in/guest controls. Direct guest routes redirect active sessions to their account workspace; guest APIs refuse active sessions and provide an approved account destination. The old static HTML URL is rewritten through the guarded route. Existing anonymous browser records are retained, not relabelled as account-owned data. Logging out restores visitor entry.

The local account page offers real workspace setup for database-backed features; removing anonymous-mode links does not make unavailable PostgreSQL modules work. Public session lookup uses the existing private file session for file mode. OIDC lookup reads the existing User/Session tables by hashed token and expiry, without pulling generated Prisma code into public routes. Its PostgreSQL integration test is provided but remains unexecuted without an isolated migrated database. No session linking by email or client flag is performed. Cross-tab notifications request server revalidation and never establish authentication.

### Editing your profile
On `/local-account`, select **Edit profile** to change your full name or sign-in email. Save persists changes to the existing private local account; Cancel discards edits. Changing the email requires your current password and a unique email address. Account IDs, passwords and existing session expiration times are preserved. Stale changes from another tab are rejected: Cancel to load the latest details before editing again. This editor applies to local accounts only; external identity providers continue to manage their own accounts.

### Personal and career details
The profile editor now also saves optional contact number, location, professional headline, LinkedIn and portfolio links, summary, skills, employment history, education, certifications and languages. Use accurate dates and factual achievements; no information is inferred. The phone field accepts international prefixes and common formatting; links must be complete HTTP(S) URLs.

**Download resume draft** exports the currently saved profile as a plain-text document with standard headings, omitting empty sections. Save changes before downloading. This local starter draft does not automatically replace master resumes, verify claims, or connect local accounts to PostgreSQL resume records. Existing uploaded resumes remain unchanged.

### Fill your profile from a resume
Use **Fill from your resume** on the local account page to upload one PDF or DOCX up to 5 MB. The server validates the document and extracts text in a limited worker. Review the source text, select the details to import, confirm that you checked them, and choose **Use selected details**. Review the editable profile, then **Save changes** to persist it. Unselected fields stay unchanged; selected fields replace their current draft values. Cancel discards the draft.

Sign-in email is never changed by importing a resume. Detected email is shown for reference. Section recognition is deterministic and can miss unfamiliar layouts; use manual entry for unrecognised sections and scanned documents. This import processes files temporarily and does not retain originals or create master resume baselines. Keep your own original document; the separate database-backed baseline workflow is unchanged.

### Career categories and role records
Resume imports now offer only Professional Summary, Technical Skills, Professional Experience, Certificates, Achievements and Education. Contact fields remain manually editable in Personal & contact details. Professional Experience is an array of individual role records; review job titles, employers, dates and responsibilities before saving. Add role and Remove controls modify the draft until Save changes.

Recognition relies on explicit source sections and role headers. Unknown role titles or employers remain blank for review. Each imported role retains its original extracted text. Legacy free-text experience remains stored and is converted into editable role records when editing; saving commits that representation. Existing standalone description/duty text is retained during this conversion. No unsupported accomplishments or credentials are generated.

### Importing personal/contact details
Uploading a resume from Edit profile now displays a separate Personal & contact details selection group alongside the six career categories. Select detected name, phone, address/location and professional links, confirm against the source, then use selected details and save. Missing fields are not invented. Email found in the document is displayed for reference and does not change account credentials. Explicit address/location labels are supported; unfamiliar layouts may require manual entry.

### Download your resume as PDF
After saving your profile, choose **Download resume PDF**. The application generates a searchable A4 UK CV using the saved contact details and career sections, with each professional role listed separately. Empty sections are omitted. Changes still in the editor must be saved before downloading.

The server validates that all source text survives PDF re-extraction before returning the document. Unsupported characters or rendering errors stop the download and display an error rather than returning an invalid file. No uploaded originals or saved profile data are modified by export. The previous plain-text download has been replaced.

### View your resume in your profile
The saved profile now includes **Resume preview** below the career sections. It displays the same authenticated PDF as Download resume PDF and refreshes after saving. **Open PDF** opens it separately when inline PDF viewing is unavailable, including on mobile browsers. Edit profile continues to show the editable sections; save changes to update the displayed resume. Preview failures show an error with Retry preview.

### Editing individual sections
Edit profile now groups fields into collapsible sections. Open the section you need or use Expand all / Collapse all. Collapsing a section preserves its unsaved values. Save changes saves all sections together; Cancel discards all unsaved edits. Resume upload remains inside Edit profile under Import from resume. Validation automatically opens a section containing invalid data.

### Tools & Technologies groups
Use **Edit Tools & Technologies → Add heading** to create multiple categories. Each group has a heading and body; enter one tool per body line. Remove deletes a group from the draft. Save changes persists all groups; Cancel discards the draft.

The profile shows three heading/body groups per table row with bullet items, and allows horizontal scrolling on narrow screens. Legacy text stays available as an editable group. Resume imports recognise explicit category labels such as `Automation: NUnit, Playwright`. PDF export uses group headings and bullet lists in a single column to keep text extraction reliable.

### Education headings and institutions
Choose **Edit Education → Add education**. Enter your main stream or qualification and college/university name in separate fields. Optional dates and additional details are available for each entry. The profile displays the qualification as a heading and the institution directly below it. Existing imported text remains accessible under Original extracted education text; review uncertain field assignments before saving.

### Executive PDF appearance
The saved-profile resume preview and download now use an original executive style: navy name/contact header, standard section headings and subtle rules, bold role titles and readable body text. The PDF remains A4, searchable and single-column; each export is checked through text re-extraction. Classic and compact templates in the separate resume-builder workflow are unchanged. The illustrative file in validation/careerpilot-executive-preview.pdf uses fictional test data and is not a generated user resume.

### In-app PDF viewer
Resume preview now renders each page using local PDF.js rather than a browser PDF plugin. Pages fit the available width, remain white on either application theme, and scroll within the viewer. Each page offers readable text; Open PDF and Download resume PDF remain available. The app serves its bundled worker from `/api/pdf-worker` with a PDF.js version query to avoid stale worker-version mismatches. No document content is sent to a third-party viewer. Edit profile is shown only in the Profile details tab.

### Contact information in your PDF
Under Personal & contact details, save your contact number, LinkedIn URL, GitHub / Git profile URL, Town / city and Country. Your account email is also included. The PDF header shows these saved details, with clickable email and professional links. Existing combined Location values remain a fallback when Town/Country are blank; addresses remain included separately. Existing GitHub URLs stored in Portfolio are still exported as Git links without duplication. Save changes before reopening Resume preview or downloading.

### Navy/gold sidebar resume
Local-account preview and download now use the supplied image's general layout: name/title in a centred navy/gold banner; contact, education, certificates and supporting details on the left; summary, skills, experience and tools on the right. Skills and tools retain their requested two-column bullet arrangements inside the main area. Long content continues onto subsequent pages without dropping text. Contact links remain clickable even when their displayed prefixes are simplified.

Each generated document is checked against the saved profile's intended text separately for the header and each column. Original uploaded resumes and account/profile data are not overwritten by export. The sample at validation/careerpilot-reference-layout-preview.pdf uses fictional fixture data to demonstrate the layout.
