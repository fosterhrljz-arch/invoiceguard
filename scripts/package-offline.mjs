import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {zipSync,unzipSync,strToU8} from 'fflate';
const root=process.cwd(),stage=path.resolve(root,'release/InvoiceGuard-offline'),zipPath=path.resolve(root,'../InvoiceGuard-offline.zip');
await fs.mkdir(stage,{recursive:true});const manifest={version:'1.1.0',files:{}};
const hash=data=>createHash('sha256').update(data).digest('hex');
const put=async(relative,data)=>{const dest=path.resolve(stage,relative);if(!dest.startsWith(stage+path.sep))throw new Error('Unsafe package path');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,data);manifest.files[relative.replaceAll('\\','/')]=hash(data);};
const copy=async(from,to=from)=>put(to,await fs.readFile(path.resolve(root,from)));
const tree=async(from,to=from)=>{for(const ent of await fs.readdir(path.resolve(root,from),{withFileTypes:true})){if(ent.isDirectory())await tree(path.join(from,ent.name),path.join(to,ent.name));else if(ent.isFile())await copy(path.join(from,ent.name),path.join(to,ent.name));}};
for(const name of ['index.html','favicon.svg','asset-manifest.json'])await copy('dist/'+name,name);
for(const name of ['app.js','app.css','app.js.map','app.css.map','app.js.LEGAL.txt','offline-assets.js'])await copy('dist/assets/'+name,'assets/'+name);
for(const name of ['src','scripts','tests','samples'])await tree(name);
for(const name of ['README.md','THIRD_PARTY_NOTICES.md','package.json','package-lock.json','vite.config.ts','dev.html'])await copy(name);
for(const name of ['eng.traineddata','chi_sim.best.traineddata','LICENSE'])await copy('vendor/tessdata/'+name);
await copy('public/favicon.svg');await tree('public/samples');
try{await copy('TEST_REPORT.md');}catch(e){if(e.code!=='ENOENT')throw e;}
// Include final evidence, not temporary browser profiles or exploratory runs.
for(const name of ['chrome','msedge','boundaries','preview']){
 try{for(const file of await fs.readdir('test-results/'+name)){if(['report.json','chrome-pdf.png','msedge-pdf.png','chrome-mobile.png','msedge-mobile.png','extracted.json','workspace.png','mobile.png','pdf-review.png','image-review.png','InvoiceGuard-summary.xlsx','InvoiceGuard-summary.csv','InvoiceGuard-issues.csv'].includes(file))await copy('test-results/'+name+'/'+file);}}catch(e){if(e.code!=='ENOENT')throw e;}
}
for(const file of ['unit-tests.tap','edge-final-attempt-failure.json','pdf-text-audit.json','cn-pdf-render.png','us-scan-render.png'])try{await copy('test-results/'+file);}catch(e){if(e.code!=='ENOENT')throw e;}
// Preserve licenses for all installed packages, including nested dependencies.
const licenses=async(dir,rel='')=>{for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.name==='.bin')continue;const next=path.join(dir,e.name),r=path.join(rel,e.name);if(e.isDirectory())await licenses(next,r);else if(e.isFile()&&/^(licen[cs]e|copying|notice|copyright)([._-]|$)/i.test(e.name))await put('licenses/'+r.replaceAll(path.sep,'__'),await fs.readFile(next));}};
await licenses(path.join(root,'node_modules'));await copy('vendor/tessdata/LICENSE','licenses/tessdata-LICENSE');
await put('package-manifest.json',strToU8(JSON.stringify(manifest,null,2)));
const zipped={};for(const name of Object.keys(manifest.files))zipped['InvoiceGuard-offline/'+name]=new Uint8Array(await fs.readFile(path.join(stage,name)));
zipped['InvoiceGuard-offline/package-manifest.json']=new Uint8Array(await fs.readFile(path.join(stage,'package-manifest.json')));
const bytes=zipSync(zipped,{level:6});await fs.writeFile(zipPath,bytes);
const check=unzipSync(bytes);for(const[name,digest]of Object.entries(manifest.files)){if(name==='package-manifest.json')continue;if(hash(check['InvoiceGuard-offline/'+name])!==digest)throw new Error('Package verification failed: '+name);}
const result={zip:zipPath,sha256:hash(bytes),bytes:bytes.length,files:Object.keys(zipped).length,verified:true};await fs.writeFile(zipPath+'.sha256',result.sha256+'  InvoiceGuard-offline.zip\n');await fs.writeFile(zipPath+'.verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
