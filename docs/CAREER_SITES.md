# Direct company career-site search

UK job search now defaults to **Company career sites**. Enter a job title, optionally a location, choose all sites or one source, then press **Search jobs**. To use previously collected employer feeds, choose **Collected employer catalogue** instead. The PostgreSQL workspace also has a **Company career sites** panel and a separate search button using its current title/location criteria.

The server fetches public career pages and parses their HTML using Cheerio. No account, LinkedIn connection, paid data provider, resume text, or API key is needed. Results are returned through `GET /api/jobs/careers`, also available through the existing guest and local-account API bridges. On the local/guest screen, results use the existing save, tracker and resume handoff controls. The PostgreSQL panel displays external results separately from database jobs; these external results are not represented as database job IDs.

| Source | Collection | Current limits |
| --- | --- | --- |
| Cognizant | Public UK search page, keyword and GB country criteria | Returns HTTP 403 from this development host. The UI reports access denied; live collection is not verified. The parser has fixture coverage only. |
| Tech Mahindra | Reads ASP.NET search state, submits the public keyword form, follows up to two More Jobs actions | At most the first 36 global result cards; only identifiable UK locations are included. Cards supply summaries. Job details depend on the portal session, so results link to the careers portal and display the job reference rather than inventing a shareable advert URL. |
| NHS Jobs | Public search results with keywords and optional location; annual salaries, employer, posting/closing dates and contract | Up to three result pages (30 cards). The portal handles its location matching. Full descriptions/person specifications are fetched for up to eight prioritised results. |
| NTT DATA UK&I | Public `/vacancies/?all=…` results, including client-side pagination groups present in the HTML | Only identifiable UK locations are included. Full descriptions are fetched for up to eight prioritised results. Missing source metadata stays unknown. |

After collection, known dates, salary, contract, employer, NHS keyword and closing-date filters are applied on the server. Location text matching applies to Cognizant, Tech Mahindra and NTT DATA; NHS uses its own upstream location search. Search is bounded, so the displayed total is the number matching the retrieved data, not an exhaustive count of all vacancies at each employer. Full-workspace filters not listed in its career-site panel are not applied to external results.

Each source has an independent status. A blocked, changed, malformed or unavailable page is reported as a source failure rather than as a successful empty search. Later-page failures retain earlier results and show a partial-coverage note. Summary-only listings are labelled; open the source advert and verify its complete requirements before tailoring.

Identical title/location/source searches share an in-flight request and reuse results for five minutes. All-source failures are cached for 30 seconds. Other local filters and result pagination reuse that same collected batch. The cache holds at most 40 searches and permits six concurrent distinct searches. Each batch has a 45-second time budget; individual requests have a 12-second timeout and a 5 MB response limit. Requests are restricted to the four fixed HTTPS hosts. Redirects to other hosts or local/private addresses are rejected. ASP.NET cookies remain server-side and are isolated to the individual Tech Mahindra search.

## Verification

- NHS and NTT DATA parser fixtures are small extracts of public result pages retrieved on 24 October 2026.
- Tech Mahindra and Cognizant parser tests use explicit synthetic fixtures.
- Tests exercise genuine form submission construction, UK-only filtering, annual salary handling, date stability across time zones, result enrichment, request deduplication, caching, blocked sources, redirect restrictions, partial pagination, and the real guest/local API bridge.
- A live development-host search for `test` successfully retrieved NHS and NTT DATA data. Cognizant returned HTTP 403. The Tech Mahindra search form worked but no identifiable UK listings appeared in that bounded batch.
- Browser regression coverage uses clearly labelled fixture results to verify rendering, source errors, tracker saving and the career-site/catalogue switch without making CI depend on employer availability.

Final local checks: all 204 root tests passed; app lint passed; guest/Vite build passed; an isolated Next.js production compilation of the new API route and results component passed. The Playwright career-site UI regression passed against the running application, including source-failure display, advert links and saving a result to the tracker. The full workspace typecheck reports unrelated errors in `src/lib/deployment.ts`, `playwright.config.ts`, and existing integration fixtures; no errors were reported in the new career-site files.
