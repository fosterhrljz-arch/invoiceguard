import { mkdir,copyFile,readdir } from 'node:fs/promises';
await mkdir('public/ocr',{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const name of await readdir('node_modules/tesseract.js-core'))if(/\.wasm(\.js)?$/.test(name))await copyFile('node_modules/tesseract.js-core/'+name,'public/ocr/'+name);
console.log('Local OCR worker and WebAssembly assets prepared.');
