# InvoiceGuard 1.1 — observed test results

Generated from actual automated test outputs. No OCR or export results are mocked.

## Executed checks

| Test | Actual result |
|---|---|
| Unit/regression tests | 29 passed, 0 failed; see unit-tests.tap |
| Chrome 156.0.8078.80 | 100 actual UI uploads; 83.346 seconds for processing |
| Edge 157.0.4341.42 | Extracted ZIP, file URL, 100 actual UI uploads; 77.814 seconds for processing |
| Networking | Browser contexts offline; zero HTTP(S) requests and zero unhandled page errors |
| Validation | 45 deliberately injected issue expectations detected across 44 affected files |
| Original files | 100/100 organized ZIP entries matched input SHA-256 and byte counts in each full workflow |
| Excel/CSV | 100 records; IDs and hashes retained; spreadsheet archive paths match the original-file manifest |
| Backup/restore | All 100 original hashes retained after restoration into a fresh context; corrupted backup rejected before any storage change |
| Historical duplicates | Detected across separate companies and batches |
| Manual workflow | Correction → review → approve → reopen → approve → reimbursed; erroneous amounts block approval and reimbursed rows are locked |
| Persistence | Reload and language switch passed; a separate persistent-profile test closed/reopened Chrome and retained records |
| Other inputs | WEBP/BMP real OCR passed; invalid XML/PDF and 31-page PDF retained as flagged records; 101 files and >25 MB rejected |
| PDF previews | Both browsers render actual canvas pixels, navigate a two-page PDF, and support original-file downloads |
| Mobile UI | Checked at 390×844, with menu opening/closing and no page-level horizontal overflow |

Execution started: Chrome **2026-11-10T04:37:04.444Z**; Edge **2026-11-10T04:53:22.675Z** (UTC).
The Edge report records SHA-256 for the exact tested index, script, stylesheet and offline engine bundle.

## Field extraction accuracy — measured, not promised

Each file is compared with independent generator inputs over 13 fields: country, currency, document type, merchant, buyer, buyer tax ID, seller tax ID, invoice number, date, category, subtotal, tax and total. Company names are compared after case/spacing/punctuation normalization; tax IDs after width/spacing/hyphen normalization. Numeric fields compare exactly. Deliberately missing fields are included and must remain missing. These percentages measure **field extraction**, not OCR character error rate or tax compliance.

| Format / country | Documents | Correct fields | Accuracy |
|---|---:|---:|---:|
| xml/CN | 15 | 195 / 195 | 100.00% |
| xml/US | 15 | 195 / 195 | 100.00% |
| pdf-text/CN | 10 | 130 / 130 | 100.00% |
| pdf-text/US | 10 | 130 / 130 | 100.00% |
| image-ocr/CN | 13 | 156 / 169 | 92.31% |
| image-ocr/US | 12 | 156 / 156 | 100.00% |
| pdf-ocr/US | 13 | 169 / 169 | 100.00% |
| pdf-ocr/CN | 12 | 145 / 156 | 92.95% |

Overall: **1276/1300 (98.15%)**. OCR-only images and scanned PDFs: **626/650 (96.31%)**. Chrome and Edge produced the same final mismatches.

**Known failures:** 23 Chinese buyer USCC fields contain OCR confusions such as O/0 or I/1; the validator flags them and human correction is required. One Chinese image's total was unreadable and remains blank/flagged. The app never fills a missing total by adding subtotal and tax, and never rewrites an ID to force a valid checksum. All 24 mismatches with expected/actual values are retained in each browser's report.json. No claim of perfect OCR is made.

The fixtures are **synthetic realistic-layout samples**, not genuine issued invoices or a representative benchmark of camera photos. They cover two invoice layout families, several expense services, namespaced/flat XML, clean and lightly degraded images, exact duplicates and cross-format duplicates. Broader layouts, very low resolution, severe rotation, handwriting, traditional Chinese and unusual XML schemas can need more corrections.

Regression thresholds are declared in tests/offline-workflow.mjs: >=90% for Chinese OCR groups, >=98% for the other groups, plus every expected injected issue detected, zero processing failures, zero network requests, and all export integrity assertions. Passing the workflow does not mean every extracted field is correct.

The 100-file stress upload uses one US-company batch so country detection must work independently of that hint. Chinese buyers therefore also produce company/cross-border findings in the UI, as expected. All deliberate issue codes are independently checked in the downloaded issue CSV. A second Chinese company and separate batches are created through the UI for historical duplicate checks. This is not a claim that the stress batch is ready for reimbursement.

## What proves the processing was real

- All 100 files are selected through the app's upload input. The UI processes each PDF, image or XML and saves its bytes in IndexedDB. Tests never inject extracted fields into storage.
- The manifest is generated from invoice-generation inputs before OCR. Application source never reads the fixture manifest or matches fixture filenames.
- An independent pypdf audit confirms all 25 scanned PDFs have **zero text characters**, and all 20 text PDFs have an actual text layer. Reported extraction routes are checked against this distinction.
- Generated PDF fixtures were rendered with Poppler and visually reviewed. Original PDFs/images and the editor's canvas previews were also inspected visually.
- Downloads are actual browser downloads. ZIP bytes are unzipped and hashed; XLSX is reopened with ExcelJS; CSV is parsed with quoting and Unicode checks. Individual PDF/image downloads also match source hashes.
- The final package has its own file-by-file hash manifest and a separate ZIP SHA-256.

## Development failures that were resolved

Initial real runs exposed an upstream Tesseract object-language initialization bug, file-URL module-worker problems, generic XML tags incorrectly implying China, label collisions (Buyer versus Buyer EIN; Description table header), split decimal OCR, and degradation from resampling scanned PDFs. These were corrected and the full workflow rerun. Sparse receipt titles now get an actual cropped OCR pass. PDF preview uses the bundled PDF renderer because the native iframe viewer could appear blank.

The execution-tool sandbox canceled browser downloads; the identical download test succeeded outside that sandbox. Final export tests therefore used isolated temporary browser profiles outside that restriction, still with networking disabled. One final package test attempt timed out while waiting for the upload input; its failure is retained in test-results/edge-final-attempt-failure.json. The unchanged app was rerun with diagnostics; this report is generated only after a complete successful run. Two test assertions were corrected against the fixture truth (empty Excel cells are strings; the WEBP/BMP fixture total is 470.08). These were test mistakes, not successful outcomes.

Exploratory tax-ID re-recognition did not improve results and was not used to hide the remaining errors. No package is passed off as requiring zero manual review.

See test-results/chrome, test-results/msedge, test-results/boundaries and test-results/preview for detailed evidence. Source tests and fixtures are included so the results can be reproduced with development dependencies.
