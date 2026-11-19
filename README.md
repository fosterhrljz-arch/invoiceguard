# InvoiceGuard 1.1 — ready-to-open offline edition

Invoice and reimbursement processing for China and the United States. This updates the existing InvoiceGuard application and retains its English / Simplified Chinese interface, companies, batches, review workflow, local storage, OCR and exports.

## Open it — no installation or commands

1. Right-click the ZIP and choose **Extract All**. Keep the whole extracted folder together.
2. Open **index.html** with Chrome or Microsoft Edge. Do not open it inside the ZIP viewer.
3. Wait for **Invoice workspace** to appear. **Success:** the address begins with `file:///` and the Upload invoices button is visible.
4. You may disconnect from the internet before the first launch. Both OCR models and all PDF/OCR dependencies are already included. No Node.js, CMD, localhost, hosting, API key, browser extension, or special browser flag is required.

The app uses JavaScript and browser storage. Use a normal browser profile on a trusted computer. Private browsing may discard records when closed. Keep `assets/` next to `index.html`; the files in that folder are required.

## First reimbursement

1. Choose **Upload invoices**, enter the company's legal name, country, and tax ID, and choose **Save & create a batch**. A Chinese company needs an 18-character Unified Social Credit Code; an ordinary US company's EIN is optional. **Success:** the batch form opens.
2. Enter a batch name, claimant and business purpose. Choose **Create & upload**.
3. Select or drop up to 100 PDF, XML, PNG, JPG, WEBP or BMP files. A file may be up to 25 MB; a PDF may contain up to 30 pages, representing **one invoice**. **Success:** each supported input becomes a saved row; failed extraction is clearly flagged and the original is retained.
4. Open each row. Compare the original or extracted text, correct fields and acknowledge your review. Correct blocking errors or exclude a document that should not be reimbursed. **Success:** its status becomes **Ready**. OCR confidence is not field accuracy and does not waive review.
5. Open **Reimbursement batches**, choose **Approve batch**, then **Mark reimbursed** after payment has actually happened. Approved batches can be reopened; reimbursed batches are locked. The app records your confirmation; it does not transfer money.
6. Use **Export** for an Excel summary, invoice CSV, issue CSV or organized ZIP. Exports cover the currently visible filters. Choose **All companies**, **All batches**, **All invoices** and clear the search to export everything.
7. Regularly use **Settings & data → Download full backup**. **Success:** a ZIP containing records and all originals is saved. A backup is needed to move data between browsers, computers, local/hosted editions, or possibly different file locations.

Use the top-right **中文 / English** button to change language. The saved data is not translated or changed.

## What stays local

OCR, PDF decoding, XML parsing, field extraction, validation, export generation and SHA-256 hashing run on your device. No invoice contents are sent to a server. The offline page blocks network connections with a Content Security Policy. Engines run in local Blob workers, with embedded WASM, language data, PDF character maps and fonts.

Records and original file blobs are saved in IndexedDB; language preference uses localStorage. Metadata and a newly uploaded original are committed together. Browser data is **not encrypted**. Browser cleanup, profile deletion, storage quotas and private-mode sessions can affect it. The app does not silently fall back to temporary memory if IndexedDB is unavailable: it reports a storage error. Keep backups in a secure location. Different browsers do not share a workspace automatically.

Existing schema-version-1 backups remain supported when all originals are present. Old demo hash labels are migrated to real SHA-256 values; hashes on actual uploaded documents are checked. The existing hosted deployment is not changed by this ZIP.

## Recognition and validation

- Text PDFs use PDF.js text extraction. Image-only pages use Tesseract OCR. A full-page scan is rendered near its source resolution to reduce resampling artifacts. Sparse US headings get a second real OCR pass. Each PDF is treated as one invoice; a multi-invoice PDF must be split first.
- English uses Tesseract's free `tessdata_fast` model; Simplified Chinese uses `tessdata_best`, both tag 4.1.0. All models and runtime resources are included; there is no first-run download.
- XML supports the included common flat invoice/Fapiao fields, party blocks and tested UBL namespaced fields. Explicit seller/document country takes precedence, followed by currency and tax-ID evidence. Generic tags such as `SellerTaxID`, `BuyerTaxID` and `TaxInclusiveTotalAmount` do not imply China. Unknown XML schemas may need manual correction.
- USCC checks normalize full-width characters, check the 18-character permitted alphabet, authority/entity/region structure and modulo-31 checksum, and explain failures. They do not query an official registry. See the [Chinese tax authority's description](https://shanghai.chinatax.gov.cn/zcfw/rdwd/201510/t419764.html) and [GB 32100-2015 record](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=24691C25985C1073D3A7C85629378AC0). Legacy Chinese tax IDs and personal invoice headers require separate review and are not represented as validated business USCCs.
- EIN checks concern format, not ownership or registration. Ordinary US receipts do not require buyer/seller EINs. No tax deductibility, legal compliance or invoice authenticity determination is made.
- Expense rules prioritize described items/services, with merchant-name fallback: meals, transportation (including fuel, rail, parking and tolls), hotels, office supplies, software, or Other. Mixed or unusual invoices remain editable.
- Duplicates are checked against all saved, non-excluded records across companies and batches using original SHA-256 or invoice identity. Similar vendor/date/currency/amount records get a warning. Editing extracted fields does not alter original files.
- Missing fields, buyer mismatches, invalid IDs, date/currency/type problems, amount reconciliation and review status remain separate checks. CNY and USD totals are never combined or automatically converted.

## Exports and original preservation

| Download | Contents |
|---|---|
| Excel summary | Invoices, Issues and Summary sheets; numeric amounts; invoice/tax IDs stored as text; original record ID, SHA-256 and archive path |
| Invoice CSV | All selected invoice rows, IDs, amounts, hashes and archive paths; UTF-8 BOM and standard quoting |
| Issue CSV | Validation findings, bilingual descriptions, original IDs/hashes/paths |
| Organized ZIP | Unmodified originals organized by company/batch/category/status, Excel/CSV reports and `manifest.json` with byte counts and SHA-256 hashes |
| Full backup ZIP | Restorable workspace and every original; hashes are checked before replacement |

**Excel and CSV are reports, not containers for original PDF/image/XML files.** Use the organized ZIP or full backup to preserve those files. Original filenames are retained in the manifest; archive path components are sanitized for filesystem safety and prefixed by unique record IDs. Excluded documents remain in an all-invoices archive for audit.

Excel can guess the wrong type when a CSV is opened by double-click. Use Excel's **Data → From Text/CSV** and set invoice/tax IDs to **Text** to preserve leading zeros and long numbers. The XLSX export already stores them as strings. CSV cells that could be interpreted as formulas receive a leading apostrophe.

An archive/backup fails clearly if a required original is absent or its recorded SHA-256 differs. A damaged or incomplete backup is rejected before it replaces current storage. Restoring a valid backup intentionally replaces the current workspace; save a backup first if you need both.

## Samples and actual test evidence

- **Load sample workspace** is an explicitly labeled fictional demo with ten prefilled records. It is not used to claim OCR accuracy.
- `samples/regression-100/` contains **100 synthetic, realistic-layout invoices** and an independent `manifest.json`: 50 Chinese and 50 US; 30 XML, 20 text PDFs, 25 PNG/JPG images and 25 image-only scanned PDFs. Some scans have slight rotation/blur. It includes invalid IDs, missing fields, inconsistent amounts, exact-file duplicates and cross-format duplicates.
- `scripts/generate-regression.py` generates the original documents and ground truth before any OCR is run. The fixture filenames/answers are not used by app extraction code. These are controlled synthetic samples, not a study of authentic commercial invoices or arbitrary camera photos.
- `TEST_REPORT.md` and `test-results/` contain observed browser versions, timing, field accuracy, individual mismatches, validation results and export integrity checks. OCR is not perfect; Chinese `0/O` and `1/I` ambiguity can require corrections. The app preserves the OCR text and flags malformed tax IDs rather than silently turning them into valid-looking IDs.
- Browser tests disable networking and open a `file:///.../index.html` URL. They use the actual upload interface, real OCR, PDF decoding, downloads and IndexedDB. No mocked OCR, precomputed extraction responses or simulated successful exports are used.

## Files and developer-only reproduction

Normal users only need the opening instructions above. The following tools are **only for developers changing the source or rerunning automated tests**, not for using InvoiceGuard.

- `index.html`, `assets/`: ready-to-open production app.
- `src/`: existing React UI, parsing, validation, extraction, storage, exports and offline worker adapter.
- `scripts/`: offline builder, fixture generator and packager.
- `tests/`: unit/regression tests and full browser workflow.
- `vendor/tessdata/`: exact local source models; `asset-manifest.json`: hashes and provenance.
- `public/`, `samples/`: original demo files and regression invoices.
- `licenses/`, `THIRD_PARTY_NOTICES.md`: dependency notices.
- `package.json`, `package-lock.json`, `vite.config.ts`, `dev.html`: reproducible development setup.

For development, use Node.js 22+ and the installed Chrome/Edge browser. `npm ci` downloads free development dependencies; production invoice files never enter that installation process.

```text
npm ci
npm run build
npm test
npm run test:browser
npm run test:edge
```

**Success:** the build prints `Offline app ready: dist/index.html`; tests report their actual checks and write JSON under `test-results/`. Opening the rebuilt root `index.html` also works directly. `npm run dev` is optional for developers and opens `dev.html`; end users never need it. Models are included, so rebuilding does not fetch models. To regenerate the synthetic invoices, run `scripts/generate-regression.py` with Python, Pillow and reportlab on Windows (Arial/SimSun available), then rerun tests. Generation is optional because all fixtures are included.

The production build uses an IIFE and classic script tags, local Blob workers and embedded binary resources. It deliberately avoids file-URL fetches, module-script imports, service workers and runtime CDNs. The Tesseract 6.0.1 initialization adapter is documented in `src/offline.js`; it fixes upstream object-language handling and does not replace OCR.

## 中文快速开始

1. 右键 ZIP，选择“全部解压”。请勿在压缩包预览窗口内直接打开。
2. 使用 Chrome 或 Edge 打开解压后的 `index.html`，无需 CMD、Node.js、服务器或联网。
3. 看到 **Invoice workspace** 即成功。点击右上角 **中文** 切换界面。
4. 添加公司和报销批次，上传单据，对照原件核对字段并修正错误。中英文 OCR 模型已内置。
5. 用“归档文件”保留原件，用“完整备份”保存可恢复的数据。Excel/CSV 仅是汇总表，不包含原文件。
6. 浏览器数据可能因清理、换浏览器或移动位置而丢失，请定期备份。OCR 不是百分之百准确，税号只做结构与校验位检查，不是官方验真。
