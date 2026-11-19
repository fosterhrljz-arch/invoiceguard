import fs from 'node:fs/promises';import path from 'node:path';import {unzipSync} from 'fflate';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const zipPath=path.resolve('../InvoiceGuard-offline.zip'),dest=path.resolve('release/verify-extracted'),files=unzipSync(new Uint8Array(await fs.readFile(zipPath)));
for(const[name,data]of Object.entries(files)){const target=path.resolve(dest,name);if(!target.startsWith(dest+path.sep))throw new Error('Unsafe ZIP entry');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);}
const manifest=JSON.parse(Buffer.from(files['InvoiceGuard-offline/package-manifest.json']).toString('utf8'));
for(const[name,expected]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(files['InvoiceGuard-offline/'+name]).digest('hex'),expected);
process.env.TEST_BROWSER='msedge';process.env.TEST_APP=path.join(dest,'InvoiceGuard-offline/index.html');await import('./offline-workflow.mjs');
