import {build,transform} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.join(root,'dist');
await fs.mkdir(path.join(out,'assets'),{recursive:true});
const read=p=>fs.readFile(path.join(root,p));
const text=async p=>(await read(p)).toString('utf8');
const b64=async p=>(await read(p)).toString('base64');
const resources={};
for(const [dir,kind] of [['cmaps','cMapUrl'],['standard_fonts','standardFontDataUrl'],['wasm','wasmUrl']]){
  for(const name of await fs.readdir(`node_modules/pdfjs-dist/${dir}`)){
    if(/\.(bcmap|pfb|ttf|wasm)$/.test(name))resources[`${kind}/${name}`]=await b64(`node_modules/pdfjs-dist/${dir}/${name}`);
  }
}
// Classic scripts work on file://. Workers are created from these local strings;
// model and WASM bytes are supplied directly, never fetched from a CDN or file URL.
const assets={version:1,ocrWorker:await text('node_modules/tesseract.js/dist/worker.min.js'),
  core:await text('node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js'),
  coreWasm:await b64('node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm'),
  languages:{chi_sim:await b64('vendor/tessdata/chi_sim.best.traineddata'),eng:await b64('vendor/tessdata/eng.traineddata')},
  pdfWorker:(await transform(await text('node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),{format:'iife',target:'chrome120',minify:true})).code,pdfResources:resources};
const assetScript='/* Offline engines and data. See THIRD_PARTY_NOTICES.md. */\nwindow.InvoiceGuardAssets='+JSON.stringify(assets)+';\n';
await fs.writeFile(path.join(out,'assets/offline-assets.js'),assetScript);
await build({entryPoints:['src/main.jsx'],bundle:true,format:'iife',platform:'browser',target:['chrome120','edge120'],outfile:path.join(out,'assets/app.js'),minify:true,sourcemap:true,legalComments:'external',define:{'process.env.NODE_ENV':'"production"','import.meta.hot':'undefined'},logLevel:'info'});
await fs.copyFile('public/favicon.svg',path.join(out,'favicon.svg'));
await fs.cp('public/samples',path.join(out,'samples'),{recursive:true});
const html=`<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; object-src 'none'; base-uri 'none'">
<title>InvoiceGuard · Offline invoice workspace</title><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./assets/app.css">
<script defer src="./assets/offline-assets.js"></script><script defer src="./assets/app.js"></script></head>
<body><div id="root"><p style="font:18px system-ui;padding:40px">Opening InvoiceGuard… 请稍候…</p></div><noscript>Please enable JavaScript. 请启用 JavaScript。</noscript></body></html>`;
await fs.writeFile(path.join(out,'index.html'),html);
// The existing project's root index also opens directly after a build.
await fs.writeFile('index.html',html.replaceAll('./assets/','./dist/assets/').replace('./favicon.svg','./dist/favicon.svg'));
await fs.copyFile('public/samples/invoiceguard-samples.zip','samples/invoiceguard-samples.zip');
const hashes={};
for(const [name,file]of [['eng','eng.traineddata'],['chi_sim','chi_sim.best.traineddata']])hashes[name]=createHash('sha256').update(await read(`vendor/tessdata/${file}`)).digest('hex');
await fs.writeFile(path.join(out,'asset-manifest.json'),JSON.stringify({models:{sources:{eng:'https://github.com/tesseract-ocr/tessdata_fast/tree/4.1.0',chi_sim:'https://github.com/tesseract-ocr/tessdata_best/tree/4.1.0'},sha256:hashes},pdfjs:JSON.parse(await text('node_modules/pdfjs-dist/package.json')).version,tesseract:JSON.parse(await text('node_modules/tesseract.js/package.json')).version},null,2));
console.log('Offline app ready: dist/index.html (double-click; no server).');
