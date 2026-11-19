export function bytes(base64){return Uint8Array.from(atob(base64),c=>c.charCodeAt(0));}
export function assets(){if(!globalThis.InvoiceGuardAssets)throw new Error('Offline assets are missing. Extract the complete ZIP before opening index.html.');return globalThis.InvoiceGuardAssets;}
export function ocrWorkerURL(){
  const a=assets();
  const wrapper=`\nconst originalCore=TesseractCore;self.TesseractCore=(options)=>originalCore({...options,wasmBinary:Uint8Array.from(atob(${JSON.stringify(a.coreWasm)}),c=>c.charCodeAt(0))});\n`;
  // Tesseract.js 6.0.1 loads {code,data} correctly but its initialize handler
  // incorrectly joins l.data as a language name. Normalize only that message
  // to code strings, before the upstream worker receives it. Models stay bytes.
  const initializeFix=`const bundledModels=new Map();self.addEventListener('message',event=>{const m=event.data;
  if(m.action==='loadLanguage'){const list=typeof m.payload.langs==='string'?m.payload.langs.split('+'):m.payload.langs;for(const lang of list)if(typeof lang!=='string')bundledModels.set(lang.code,lang);m.payload.langs=list.map(lang=>typeof lang==='string'&&bundledModels.has(lang)?bundledModels.get(lang):lang);}
  if(m.action==='initialize'&&Array.isArray(m.payload?.langs))m.payload.langs=m.payload.langs.map(l=>typeof l==='string'?l:l.code);});\n`;
  return URL.createObjectURL(new Blob([a.core,wrapper,initializeFix,a.ocrWorker],{type:'text/javascript'}));
}
export class LocalPDFData {
  async fetch({kind,filename}){const data=assets().pdfResources[`${kind}/${filename}`];if(!data)throw new Error(`Bundled PDF resource missing: ${filename}`);return bytes(data);}
}
export function pdfWorker(){return new Promise((resolve,reject)=>{
 const url=URL.createObjectURL(new Blob([assets().pdfWorker],{type:'text/javascript'})),port=new Worker(url);
 const clean=()=>{clearTimeout(timer);URL.revokeObjectURL(url);port.removeEventListener('message',ready);};
 const fail=message=>{clean();port.terminate();reject(new Error(message));};
 const timer=setTimeout(()=>fail('Local PDF worker did not start within 30 seconds.'),30000);
 const ready=e=>{if(e.data?.action==='ready'){clean();resolve(port);}};
 port.addEventListener('message',ready);port.addEventListener('error',e=>fail('Local PDF worker failed: '+(e.message||'unknown worker error')),{once:true});
});}
