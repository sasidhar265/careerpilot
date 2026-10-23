# Validation of JD & PS.pdf

The supplied PDF is 422,071 bytes, has 10 pages, and contains readable embedded text. It is an Imperial College Healthcare NHS Trust recruitment information pack for a **Test Analyst, Band 5**, in ICT, working 37.5 hours per week and reporting to the Test Manager.

## Document findings

The job description and person specification describe:

- Test specifications, test scripts, test data, and realistic testing estimates.
- Test execution, UAT witness testing, coverage, and traceability matrices.
- Defect logging, retesting, manual regression packs, and quality assurance.
- Healthcare/NHS systems and Cerner applications (OCS, PAS, Firstnet, Surginet).
- SQL querying; Agile, V-model, and Waterfall methodologies; IT project lifecycle.
- Engineering or Computer Science degree and 1–2 years of software testing experience.
- ISTQB/ISEB Foundation certification in the desirable qualifications column.
- Analytical/investigation skills, multidisciplinary teamwork, and supplier/user collaboration.

These are document-based findings, not results of a successful OpenAI request. The person specification is arranged in essential/desirable columns; preserve that distinction when reviewing AI output.

## Checks and fix

PDF extraction succeeded on all 10 pages. The existing reader incorrectly treated the short, readable cover page as a scan because it had fewer than 30 characters. Updated the shared readability check so this cover no longer triggers unnecessary OCR. OCR remains available for scanned pages.

PDF and DOCX export generation was tested with a clearly labeled synthetic sample. Both exported documents were reopened and their text checked. They are format-validation artifacts, not an updated resume for the user.

## Remaining work

The configured OpenAI request was attempted but failed with HTTP-equivalent application status 504: the execution environment could not reach OpenAI. See `api-result.json`. No live AI analysis, comparison, or rewrite was completed.

No user resume was provided in this folder. User resume comparison and tailored output require that input. No browser automation tool was available, so visual attachment/preview behavior was not browser-verified.

Artifacts: `job-description.txt`, `pdf-check.json`, `api-result.json`, `sample-export.pdf`, `sample-export.docx`.
