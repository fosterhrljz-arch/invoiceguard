# InvoiceGuard offline dependencies

All production libraries, workers, WASM engines, PDF CMaps and standard fonts,
and both OCR models are included in `assets/`. There are no runtime CDNs.
No paid APIs, telemetry SDKs, external invoice processing, or account services
are used. Library license texts are in `licenses/` and bundled code notices in
`assets/app.js.LEGAL.txt`. Exact package versions are in `package-lock.json`.

| Component | Source | License |
|---|---|---|
| Tesseract.js 6.0.1 | https://github.com/naptha/tesseract.js | Apache-2.0 |
| Tesseract.js core 6.1.2 | https://github.com/naptha/tesseract.js-core | Apache-2.0 |
| English fast model, tag 4.1.0 | https://github.com/tesseract-ocr/tessdata_fast/tree/4.1.0 | Apache-2.0 |
| Simplified Chinese best model, tag 4.1.0 | https://github.com/tesseract-ocr/tessdata_best/tree/4.1.0 | Apache-2.0 |
| PDF.js 5.7.284 | https://github.com/mozilla/pdf.js | Apache-2.0; font/CMap notices included |
| React / React DOM | https://github.com/facebook/react | MIT |
| Lucide React | https://github.com/lucide-icons/lucide | ISC |
| ExcelJS | https://github.com/exceljs/exceljs | MIT |
| fflate | https://github.com/101arrowz/fflate | MIT |
| idb | https://github.com/jakearchibald/idb | ISC |
| fast-xml-parser | https://github.com/NaturalIntelligence/fast-xml-parser | MIT |

`asset-manifest.json` contains the hashes of the exact OCR models used.
The PDF worker is transformed from ESM to an IIFE using esbuild, without
changing its PDF parsing logic, so it runs in a classic Blob worker on file URLs.

`src/offline.js` contains a documented Tesseract.js 6.0.1 adapter:
the upstream worker loads `{code, data}` language inputs but incorrectly uses
`data` as the language name during initialization. The adapter passes language
codes to initialization, retains model bytes for any reinitialization, and supplies
the WASM binary directly. This bypasses no recognition, validation, or extraction.
It does not use fixture names, known answers, or a remote OCR service.

Synthetic fixtures are drawn with Windows Arial and SimSun during development.
Font files themselves are not distributed. Text PDF fixtures contain the subset
of glyphs needed to display the sample invoice. The app does not require these
Windows fonts to process uploaded documents.
