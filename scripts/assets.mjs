import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
const target = 'public/vendor/ocr';
await mkdir(target, { recursive: true });
await copyFile('node_modules/tesseract.js/dist/worker.min.js', `${target}/worker.min.js`);
for (const file of await readdir('node_modules/tesseract.js-core')) if (/\.wasm(\.js)?$/.test(file)) await copyFile(`node_modules/tesseract.js-core/${file}`, `${target}/${file}`);
for (const lang of ['deu', 'eng']) await copyFile(`node_modules/@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`, `${target}/${lang}.traineddata.gz`);
// The engine and the language data are Apache-2.0: a copy of the licence travels with them.
await copyFile('node_modules/tesseract.js-core/LICENSE', `${target}/LICENSE`);
console.log('OCR assets copied locally from lockfile-installed packages.');
// Pyodide (Python for code execution on the device): the runtime only, no optional packages.
// The folder carries the exact version, so the server may let browsers keep these files.
const pyodide = JSON.parse(await readFile('node_modules/pyodide/package.json', 'utf8'));
const pyTarget = `public/vendor/pyodide/${pyodide.version}`;
await mkdir(pyTarget, { recursive: true });
for (const file of ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) await copyFile(`node_modules/pyodide/${file}`, `${pyTarget}/${file}`);
// MPL-2.0: the licence and the place of the source travel with the files (docs/third-party-pyodide-20261114.md).
await writeFile(`${pyTarget}/NOTICE.txt`, `Pyodide ${pyodide.version}: unchanged files from the npm package "pyodide".\nLicence: Mozilla Public License 2.0, https://www.mozilla.org/MPL/2.0/\nSource: https://github.com/pyodide/pyodide (tag ${pyodide.version})\nIt contains CPython (Python Software Foundation License) and other components; their licences are in the source repository.\n`);
console.log('Pyodide runtime copied locally from the lockfile-installed package.');
