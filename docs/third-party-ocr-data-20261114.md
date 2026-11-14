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
- **The browser keeps the language data after the first run (owner decision of 14 November 2026).** The engine's own cache is on: after the first OCR run it writes the two unpacked language files into the browser's IndexedDB (database `keyval-store`, keys `ocr-data-1.0.0-4.0.0/deu.traineddata` and `ocr-data-1.0.0-4.0.0/eng.traineddata`), 38.9 MB together (14.7 MB German, 22.4 MB English). Later runs read them from there and do not download them. This is public data from the npm packages above. It holds nothing of the user: no photo, no recognised text, no account detail.
- **How a person removes it:** delete this site's data in the browser settings. That also deletes saved conversations on the device, because they live in the same browser storage. "Delete everything on this device" in the app does not remove the language data.
- **What is still downloaded on every run:** the engine script (111 kB) and one engine file (3.9 MB in Chromium), about 4 MB. They are served with `Cache-Control: no-store`, like every file outside Vite's hash-named build files. A later run is about 4 MB instead of about 21 MB.
- **When storage is blocked or the copy is bad.** The engine reads the kept copy inside a try and downloads the file when the read fails or finds nothing (a private window with storage blocked, a full disk, a cleared browser). A failed write is only logged; the run goes on. A write is one IndexedDB transaction, so a half-written copy is not kept. If the engine cannot start with a kept copy it deletes it. The app then starts the engine once more with a fresh download that skips the kept copy (`cacheMethod: "refresh"` in `src/extraction.worker.ts`).
- **When the data changes.** The key carries the package version and the data folder (`1.0.0`, `4.0.0`). `tests/ocr-assets.test.ts` fails when the installed packages or the folder in `scripts/assets.mjs` no longer match the name in the worker, so new data is never hidden behind an old copy. The old copy then stays in the browser unused until the person clears the site data; delete the old keys in code when that day comes.
- **Why this way and not HTTP caching.** Long-lived HTTP caching needs a version in the file path, a change to the static file rule and a wider rule in the Render bridge, which today lets browsers keep only hash-named files the app itself marked. The engine's cache needs no server change and leaves that reviewed rule alone. The cost: the engine script and engine file are still downloaded each run, and the kept data is the unpacked size.
- The content security policy (`connect-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self' blob:`) lets the browser load these files from our own origin only. The engine has built-in fallback addresses on `cdn.jsdelivr.net`; they are not used because all three paths are set, and the policy would block them.

## Open points

- **Download size.** 21 MB on the first OCR run is a lot on a phone, and so is 39 MB kept in the browser. Still open: (1) the engine script and engine file (about 4 MB) are downloaded on every run; (2) switch both languages to the `4.0.0_best_int` files from the same packages (1.3 MB German, 3.0 MB English), which hold only the recognition model the app uses; accuracy would have to be re-checked.
- Tested by `tests/ocr-assets.test.ts`. That test reads the source in Node. No test runs OCR twice in a real browser and checks that the second run downloads no language data, and none runs it in a private window.
