# OCR engine and language data: licences and sources (14 November 2026)

Owner decision of 14 November 2026: add German OCR data, on three conditions. It is served from our own domain, the licence is checked and recorded, and it is loaded only when OCR runs. This file is the record.

## What is shipped

| Package (npm) | Version | File we ship | Size as downloaded (gzip) | Size unpacked | SHA-256 of the shipped file |
| --- | --- | --- | --- | --- | --- |
| `@tesseract.js-data/deu` | 1.0.0 | `4.0.0/deu.traineddata.gz` as `/vendor/ocr/deu.traineddata.gz` | 7,101,284 bytes (6.8 MB) | 15,437,534 bytes (14.7 MB) | `f5618a8b8d07f6c7a633ce243bf075bb90f4145bb15c9264734c7cc63aa33205` |
| `@tesseract.js-data/eng` | 1.0.0 | `4.0.0/eng.traineddata.gz` as `/vendor/ocr/eng.traineddata.gz` | 10,923,060 bytes (10.4 MB) | 23,466,654 bytes (22.4 MB) | `ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468` |
| `tesseract.js` | 7.0.0 | `dist/worker.min.js` as `/vendor/ocr/worker.min.js` | not compressed by us | 111,307 bytes | not recorded |
| `tesseract.js-core` | 7.0.0 | the `.wasm.js` engine files in `/vendor/ocr/`; a browser loads one of them | not compressed by us | 3.9 MB to 4.7 MB each | not recorded |

All four come from the npm registry, pinned to exact versions in `package.json` and by integrity hash in `package-lock.json`. `scripts/assets.mjs` copies them into `public/vendor/ocr` during `npm run assets` and `npm run build`. Nothing is fetched from a CDN at build time or at run time.

## Licences

- **Language data (German and English).** The npm packages are published from `https://github.com/naptha/tessdata`. Their `package.json` says `"license": "MIT"`; the packages contain no licence file. The repository itself is marked Apache-2.0, and its README gives the source of the `4.0.0` files as `https://github.com/tesseract-ocr/tessdata`, whose `LICENSE` file is the Apache License, Version 2.0. We treat the data as Apache-2.0 (the stricter of the two statements). Both MIT and Apache-2.0 allow us to serve the unchanged file from our own server.
- **Engine.** `tesseract.js` 7.0.0 and `tesseract.js-core` 7.0.0 are Apache-2.0 (their `package.json` and licence files).
- **What Apache-2.0 asks of us.** Pass on a copy of the licence and do not remove notices. `scripts/assets.mjs` copies the Apache-2.0 text to `/vendor/ocr/LICENSE`. We do not change the data files.

Checked on 14 November 2026 by reading the installed packages and the two GitHub pages. Not checked: whether upstream has a `NOTICE` file that must travel with the data (none was seen), and no lawyer has read this.

## How it is loaded

- Only `src/extraction.worker.ts` names `/vendor/ocr`. It starts the OCR engine with German and English together, and only when a photo, a screenshot or a PDF with no text layer is read.
- A person's first OCR run downloads the engine script (111 kB), one engine file (3.9 MB in Chromium) and both language files (17.2 MB together, already gzip-compressed, so the transfer is the same size). About 21 MB in all. Before German was added it was about 14 MB.
- The files are served with `Cache-Control: no-store`, like every file outside Vite's hash-named build files, and the engine's own cache is off (`cacheMethod: "none"`). So each OCR run downloads them again. This is the same as for the English file before. Changing it is an open point for the owner, see below.
- The content security policy (`connect-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self' blob:`) lets the browser load these files from our own origin only. The engine has built-in fallback addresses on `cdn.jsdelivr.net`; they are not used because all three paths are set, and the policy would block them.

## Open points

- **Download size.** 21 MB on every OCR run is a lot on a phone. Two ways to cut it, neither done: (1) let the browser keep the files (they change only when the package version changes, so a version in the path plus a long cache time would be safe); (2) switch both languages to the `4.0.0_best_int` files from the same packages (1.3 MB German, 3.0 MB English), which hold only the recognition model the app uses; accuracy would have to be re-checked.
- Tested by `tests/ocr-assets.test.ts`.
