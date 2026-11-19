import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { zipSync,strToU8 } from 'fflate';
import { sampleWorkspace } from '../src/samples.js';
const state=sampleWorkspace();await mkdir('public/samples',{recursive:true});const archive={};
for(const d of state.documents){await writeFile('public/samples/'+d.filename,d.rawText);archive[d.filename]=strToU8(d.rawText);}
const lines=['SAMPLE - NOT A REAL INVOICE','US Invoice','Seller: Northstar Office Supplies','Invoice Number: SAMPLE-PDF-001','Date: 2026-11-04','Buyer: Northstar Studio LLC','Buyer Tax ID: 12-3456789','Seller Tax ID: 23-4567891','Currency: USD','Description: Office supplies','Subtotal: 100.00','Tax: 8.50','Total: 108.50'];
let stream='BT /F1 15 Tf 55 755 Td 25 TL\n'+lines.map((line,i)=>(i?'T* ':'')+'('+line.replace(/[()\\]/g,'\\$&')+') Tj').join('\n')+'\nET';
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
let pdf='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
await writeFile('public/samples/us-invoice.pdf',pdf);archive['us-invoice.pdf']=strToU8(pdf);
try{archive['us-receipt.png']=new Uint8Array(await readFile('public/samples/us-receipt.png'));}catch{}
archive['README.txt']=strToU8('All files are synthetic. The XML records include deliberate invalid IDs, arithmetic errors, and duplicates. One file = one invoice. US company: Northstar Studio LLC, EIN 12-3456789. China company: '+state.companies[1].name+', USCC '+state.companies[1].taxId+'. Use Load sample workspace to explore pre-extracted examples. To test extraction, upload these files to a new batch.');await writeFile('public/samples/invoiceguard-samples.zip',zipSync(archive));console.log('Sample XML, PDF and ZIP generated.');
