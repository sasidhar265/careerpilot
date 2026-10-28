# CareerPilotAI workspace redesign

## Inspection and design direction

The original foundation had a green sidebar without active navigation, fixed light backgrounds, a flat discovery form, a text-only resume form beside large history cards, and a tracker made of independent forms. It lacked Saved Jobs and Settings destinations, loading skeletons, in-place job details, document preview and tracker view switching.

The implemented identity uses an ink navy navigation rail, blue interactive accents, soft mint highlights, quiet surface borders, restrained shadows and a system sans-serif type stack. Documents retain white paper for an intentional preview of the exported format. No reference graphics, logos, result data or pixel layouts are copied.

## Shared components and state

- Design tokens live in `apps/careerpilot-ai/src/app/globals.css`. Light/dark/system appearance is controlled at the root, stored locally when available and retained in memory if browser storage is blocked. System mode responds to the OS preference. No external font request is necessary.
- AppShell provides active navigation, desktop rail, mobile disclosure menu, Escape handling and logout. The menu closes when a destination is selected. Settings links back to the preserved candidate profile; recommendations retain their existing route.
- Shared Button, Input, Textarea, Card, Badge, EmptyState and SaveJob components provide consistent actions and surfaces. Forms use labels, visible focus, real error/status feedback and pending states.
- Workspace loading/error boundaries preserve the shell and provide a real retry action. Reduced-motion preferences disable decorative animation.

## Implemented workflows

| Screen | Implemented behavior |
|---|---|
| Dashboard | Counts and recent activity from owned database queries, real checklist completion, application stage totals, due follow-ups and working navigation |
| Discover Jobs | Prominent search; collapsible filter sidebar; existing URL-backed keyword/location/employer/source/contract/arrangement/date/salary/sort; selectable cards; details panel; real save, AI review/tailoring and employer links |
| Match indicators | Explicitly unreviewed until an actual AI review returns a qualitative fit. No fabricated numeric match percentages |
| Saved Jobs | Owned visible saved opportunities; removing from shortlist hides the entry without deleting its tracker history or resetting its stage |
| My Resumes | Bounded existing upload/extraction, master editor, live text preview, transparent ATS text checks, side-by-side saved-version comparison, version history, edit-copy and existing PDF/DOCX downloads |
| JD Analyzer | Resume selection, actual AI analysis, evidence quotes, strengths/requirements report and saved tailored-version link |
| Tracker | Kanban/table state, selectable application details, status/notes persistence, owner-checked associated resume version, applied dates, persisted reminder and real `.ics` calendar download |
| Assistant | Editable starter prompts, actual provider requests, conversation log, visible failures/pending state and returned evidence |
| Settings | Persisted browser appearance, owned account details, profile links, resume/tracker links and real session logout |

ATS readiness checks inspect text, email, recognisable section headings and a broad document-length guide. They are explicitly not an employer ATS score or a guarantee of parsing. The preview is a text layout; downloads use the existing export templates. Comparison counts distinct changed lines rather than asserting factual improvements. Follow-ups appear in-app and can be added to a calendar; no email/push delivery is claimed.

## Data and integration preservation

All existing routes remain available. The original Vite app and root data/environment files remain intact. The additional `202610220002_tracker_workspace` migration only adds nullable `Application.resumeId` and `reminderAt`, an index and a foreign key. Resume association is verified against the signed-in owner before updating. Existing saves no longer reset an applied job to Saved. PATCH responses include the persisted application so tracker feedback uses actual server timestamps.

Run the existing migration command before starting the redesigned app:

```sh
npm --prefix apps/careerpilot-ai run db:generate
npm --prefix apps/careerpilot-ai run db:migrate
```

## Responsive and accessibility validation

Desktop uses a 236px rail; below 1024px navigation becomes a disclosure. Discovery changes from filters/results/details to filters/results with details below at intermediate widths, then a single column below 640px. Resume editing/comparison stacks on smaller screens. The Kanban and table have labelled, keyboard-focusable horizontal scrolling regions; the page itself should not scroll horizontally. No drag-only interaction is required.

Core light/dark text token pairs were checked mathematically against WCAG AA 4.5:1; the lowest checked ratio is 5.92:1. This is a token audit, not a full accessibility certification. Keyboard focus, native controls, skip navigation, semantic table headers, labelled regions, status messages and reduced-motion rules are implemented. Browser and assistive-technology checks remain release gates.

Playwright coverage was extended for theme persistence, 390px mobile navigation and overflow, resume editing/preview/save/compare, real job save, Kanban/table, reminder and resume persistence, cross-owner resume rejection, calendar download, shortlist removal preserving application status, 1024px overflow and 1440px active navigation. These tests require the isolated test database and both migrations.

## Validation results

- Existing regression tests: **159 passed**.
- Foundation unit tests: **8 passed**, including the four new workspace logic tests.
- Syntax transforms: **77 TypeScript/TSX modules passed**; browser bundle resolution: **12 client entries passed without Node imports**. These are not TypeScript type checking.
- Core token contrast: **passed** for five text/background pairs in each theme.
- New-app lint, typecheck, build and E2E were attempted but are **blocked**: missing installed ESLint/Prisma/Next/Playwright Test dependencies, with installation failing `ENOTFOUND registry.npmjs.org`. The available unrelated Playwright executable cannot run `test`.
- Live responsive screenshots, keyboard/screen-reader checks, migrations and browser tests could not execute in this environment. Local server startup is also blocked by sandbox `listen EPERM`. No browser-rendered visual validation or production readiness is claimed.


## Theme consistency across built-in guest and account pages

The built-in guest workspace retained the older green/DM Sans styling while Next landing/account screens used navy/blue/system typography; guest did not apply the saved CareerPilotAI appearance preference. This documented mismatch justified a styling-only integration correction. Both now import `src/theme-tokens.css` for palettes, font stack, feedback surfaces, control/card radii and shadows, and use the same pure `src/theme.js` preference store/listener/binding logic. The existing `careerpilot-theme` key is preserved across same-origin navigation and tabs. The guest/local header now includes an appearance selector; unavailable storage retains an in-memory preference.

Legacy UI colour literals were replaced with semantic tokens, navigation/sidebar styling and responsive control dimensions aligned, and the separate Google font request removed. Resume paper/ATS typography remains explicitly white/dark and is not recoloured into the UI theme. Data, job sources, authentication and document-generation logic are unchanged. Built guest assets were regenerated.

Verification: 175 root tests and 91 app tests pass; new native tests exercise shared persisted preferences, blocked storage, system changes and listener cleanup. App lint, focused TypeScript for theme/UI dependencies and the actual Next Tailwind/PostCSS pipeline pass. Root/guest Vite builds pass with the existing large-chunk warning. Added browser computed-colour/font and preference-persistence assertions between the landing and `/guest`, plus mobile overflow. Browser execution still fails at listen EPERM before assertions, so visual/accessibility/browser conformance is not claimed.


## Local account layout consistency

`/local-account` used its own narrow centred container/header/footer while other signed-in screens used the full workspace shell. It now reuses AppShell and PageHeading, with the existing navy navigation, header/theme/account controls, copyright footer, responsive two-column cards and shared spacing. Real profile fields, account/session details, appearance and guest access remain connected.

AppShell accepts an explicit local mode. Its navigation uses actual account/profile/security/appearance anchors and working guest/setup links; it does not direct file users into unavailable PostgreSQL screens. Brand and logout destinations preserve local mode. Native anchor navigation updates its active state, and mobile navigation closes after selection. The database-backed shell keeps its existing destinations.

Verification: lint, focused local-page/shell TypeScript, Next CSS compilation and isolated Next/Turbopack local auth/account compilation pass. Updated browser scenarios cover shared desktop shell, mobile menu/profile anchors, current location and overflow, but browser execution remains subject to the existing localhost listen restrictions. The local journey now tests its real Dashboard link instead of assuming database-backed `/dashboard` can compile without ORM setup. No database capability is simulated by the new layout.


## Screenshot-driven account-control correction

The supplied screenshot showed a plain initial instead of the avatar circle, vertically stacked account controls, the native details marker and clipped theme text. The generated global stylesheet contained the rules, so the exact browser delivery/cache cause was not established. Replaced reliance on those global account selectors with component-imported CSS modules for AccountMenu/UserAvatar. Replaced native details/summary with a button-controlled disclosure: no default marker, explicit expanded state, horizontal 44px controls, outside-click/focus-leave dismissal and Escape focus return. Profile links/logout remain real actions and guest visibility rules remain unchanged. Shared avatar variants cover the header, navigation, menu and profile card. Widened the shared desktop appearance control and adjusted small-screen text space.

Verification: lint, focused TypeScript with Next CSS-module ambient types, component browser bundling with emitted CSS and PostCSS compilation pass. The isolated local-account/auth compilation passes with Next Webpack (`CAREERPILOT_CHECK_BUNDLER=webpack npm --prefix apps/careerpilot-ai run test:auth:compile`). Default Turbopack compilation now needs a PostCSS worker port and fails under the sandbox with EPERM; this is not recorded as a pass. Browser binaries are absent and an isolated /tmp headless-browser download failed DNS, so no rendered screenshot verification was performed. Browser regression assertions now check avatar display/dimensions and equal header control alignment rather than just presence of the initial.

### Profile resume import review
The local profile import uses `ResumeImportReview` with scoped CSS and existing application tokens. Contact and career fields are separated into responsive cards. Short values remain visible; longer sections expand on demand. The section includes selection counts, Select all, Clear selection, extraction notes, full source text and a separate confirmation/action area. Changing selection clears the review confirmation. No import is saved automatically.

### Tools & Technologies visual alignment
Grouped tools now use application-themed category cards within the required three-column table. Muted heading bands, primary-colour category icons and bullet markers, 12px corners, compact text and shared border tokens replace the spreadsheet-style cell grid. Blank table slots have no visible boxes. The editor uses matching group cards with shared Input/Textarea/Button controls and consistent spacing. All colours adapt through existing light/dark tokens; narrow screens retain keyboard-accessible horizontal scrolling.

### Local account modernization
Reason: user requested a more modern presentation of `/local-account`. The earlier long panel made contact details, individual career sections and the document preview difficult to scan.

The page now uses a profile header, a compact contact card, individual career cards with section icons/Edit actions, a role timeline, and a separate resume-preview/download card. Contact and career columns use the full available content width, stacking below 1280px. Mobile uses compact padding; colours and surfaces inherit shared light/dark tokens. Editor panels remain collapsible, with sticky save/cancel/cleanup controls. No additional cross-page navigation, guest content, Appearance or Account & security containers were introduced.

### Latest account workspace layout (supersedes the sidebar/card layout)
Following user feedback, the account page now uses Profile details and Resume preview tabs within one workspace. The repeated page title, side contact panel and separate career card borders were removed. Contact data uses a full-width responsive grid; career sections use consistent dividers. The header keeps profile editing and real PDF download within reach. Resume preview loads on demand in its own panel. Tabs provide native button focus, ARIA relationships and arrow/Home/End keyboard navigation. No other-page navigation or guest content was added.
