import { mkdir, copyFile, readdir } from 'node:fs/promises';
const target = 'public/vendor/ocr';
await mkdir(target, { recursive: true });
await copyFile('node_modules/tesseract.js/dist/worker.min.js', `${target}/worker.min.js`);
for (const file of await readdir('node_modules/tesseract.js-core')) if (/\.wasm(\.js)?$/.test(file)) await copyFile(`node_modules/tesseract.js-core/${file}`, `${target}/${file}`);
for (const lang of ['deu', 'eng']) await copyFile(`node_modules/@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`, `${target}/${lang}.traineddata.gz`);
console.log('OCR assets copied locally from lockfile-installed packages.');
