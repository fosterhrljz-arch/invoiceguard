import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validate,normalizeName,normalizeID} from '../src/core.js';
const channel=process.env.TEST_BROWSER||'chrome', app=path.resolve(process.env.TEST_APP||'dist/index.html');
const dir=path.resolve('samples/regression-100'),fixture=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const out=path.resolve('test-results',channel);await fs.mkdir(out,{recursive:true});
const report={browser:channel,appURL:pathToFileURL(app).href,started:new Date().toISOString(),offline:true,networkRequests:[],pageErrors:[],checks:[],mismatches:[]};
report.artifactHashes={};for(const file of ['index.html','assets/app.js','assets/app.css','assets/offline-assets.js'])report.artifactHashes[file]=createHash('sha256').update(await fs.readFile(path.join(path.dirname(app),file))).digest('hex');
const browser=await chromium.launch({channel,headless:true});report.browserVersion=browser.version();
const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:1440,height:1000}}),page=await context.newPage();
context.on('request',r=>{if(/^https?:/i.test(r.url()))report.networkRequests.push(r.url());});page.on('pageerror',e=>report.pageErrors.push(e.message));
export async function workspace(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('invoiceguard-local-v1',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,r=db.transaction('workspace').objectStore('workspace').get('current');r.onsuccess=()=>{resolve(r.result);db.close();};r.onerror=()=>reject(r.error);};}));}
let timer;
try{
 await page.goto(report.appURL);await page.getByRole('button',{name:'Upload invoices',exact:true}).click();
 await page.locator('input[name=name]').fill('Northstar Studio LLC');await page.locator('input[name=taxId]').fill('12-3456789');
 await page.getByRole('button',{name:'Save & create a batch',exact:true}).click();await page.locator('input[name=name]').fill('100 mixed invoices');await page.locator('input[name=employee]').fill('Synthetic Test');await page.locator('textarea[name=purpose]').fill('Offline regression with real file processing');await page.getByRole('button',{name:'Create & upload',exact:true}).click();
 const start=Date.now();await page.locator('input[type=file][multiple]').setInputFiles(fixture.records.map(r=>path.join(dir,r.filename)));
 timer=setInterval(async()=>console.log(channel,await page.locator('.progress-bar').textContent({timeout:1000}).catch(()=>'')),15000);
 await page.getByRole('dialog',{name:'Upload invoices',exact:true}).waitFor({state:'hidden',timeout:1200000});clearInterval(timer);report.processingSeconds=(Date.now()-start)/1000;
 const state=await workspace(page);await fs.writeFile(path.join(out,'extracted.json'),JSON.stringify(state,null,2));
 assert.equal(state.documents.length,100,'all 100 actual files must be imported');report.checks.push('100 files imported via UI');
 const processingErrors=state.documents.filter(d=>d.processingError);report.processingErrors=processingErrors.map(d=>({file:d.filename,error:d.processingError}));
 const fields=['country','currency','documentType','vendor','buyer','buyerTaxId','sellerTaxId','invoiceNumber','date','category','subtotal','tax','total'];report.accuracy={};
 const norm=(f,v)=>['buyer','vendor'].includes(f)?normalizeName(v):f.endsWith('TaxId')?normalizeID(v):v??'';
 for(const r of fixture.records){const doc=state.documents.find(d=>d.filename===r.filename);assert(doc);assert.equal(doc.extraction,r.extraction,'correct file processing route: '+r.filename);assert.equal(doc.hash,r.sha256,'SHA-256 input: '+r.filename);const codes=validate(doc,fixture.companies.find(c=>c.country===r.expected.country),state.documents).map(i=>i.code);
  for(const field of fields){const key=r.extraction+'/'+r.expected.country;const group=report.accuracy[key]??={correct:0,total:0,documents:0,fields:{}};const metric=group.fields[field]??={correct:0,total:0};metric.total++;group.total++;if(field===fields[0])group.documents++;
   if(norm(field,doc[field])===norm(field,r.expected[field])){metric.correct++;group.correct++;}else report.mismatches.push({file:r.filename,field,expected:r.expected[field],actual:doc[field]??null});
  }
  r.detectedIssues=codes;r.missingExpectedIssues=r.expectedIssues.filter(c=>!codes.includes(c));
 }
 report.validation=fixture.records.filter(r=>r.expectedIssues.length).map(r=>({file:r.filename,expected:r.expectedIssues,detected:r.detectedIssues,missing:r.missingExpectedIssues}));
 assert(report.validation.every(r=>r.missing.length===0),'all deliberately injected issue codes must be detected');
 for(const [kind,a]of Object.entries(report.accuracy))assert(a.correct/a.total>=(kind.endsWith('/CN')&&kind.includes('ocr')?.90:.98),'field accuracy regression: '+kind);
 report.checks.push('All injected issues detected; field accuracy meets documented regression thresholds');
 await page.reload();assert.equal((await workspace(page)).documents.length,100);await page.getByRole('button',{name:'中文',exact:true}).click();await page.getByRole('heading',{name:'发票工作区',exact:true}).waitFor();await page.getByRole('button',{name:'English',exact:true}).click();report.checks.push('IndexedDB persists across reload; Chinese and English switch');
 await page.screenshot({path:path.join(out,'workspace.png'),fullPage:true});
 // Exports, backup, manual review and historical duplicates are tested by a
 // reusable UI helper; every downloaded original is compared with the inputs.
 if(!process.env.EXTRACTION_ONLY){const {verifyWorkflow}=await import('./workflow-checks.mjs');await verifyWorkflow({page,context,state,fixture,out,report,workspace,dir});}
 assert.equal(report.processingErrors.length,0,'no processing failures');assert.equal(report.networkRequests.length,0,'no HTTP(S) traffic');assert.equal(report.pageErrors.length,0,'no unhandled browser errors');
 report.checks.push('No HTTP(S) requests; no processing or browser errors');report.completed=new Date().toISOString();report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(out,'failure-dom.txt'),await page.locator('body').innerText().catch(()=>''));console.error(e);}finally{clearInterval(timer);await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({passed:report.passed,seconds:report.processingSeconds,checks:report.checks,accuracy:Object.fromEntries(Object.entries(report.accuracy||{}).map(([k,v])=>[k,{correct:v.correct,total:v.total}])),mismatches:report.mismatches.length,failure:report.failure},null,2));}
