import { parseText,parseXML } from './core';
import {assets,bytes as decodeBytes,ocrWorkerURL,pdfWorker,LocalPDFData} from './offline.js';
let workerPromise,progressHandler;
async function recognize(image,onProgress,dimensions){
  progressHandler=onProgress;
  if(!workerPromise){workerPromise=import('tesseract.js').then(async({createWorker})=>{
    const workerPath=ocrWorkerURL();
    try{const worker=await createWorker(Object.entries(assets().languages).map(([code,data])=>({code,data:decodeBytes(data)})),1,{workerPath,workerBlobURL:false,cacheMethod:'none',gzip:false,logger:m=>progressHandler?.(m.status,Math.round((m.progress||0)*100))});await worker.setParameters({preserve_interword_spaces:'1',user_defined_dpi:'300'});return worker;}finally{URL.revokeObjectURL(workerPath);}
  }).catch(e=>{workerPromise=null;throw e;});}
  const worker=await workerPromise;
  const {data}=await worker.recognize(image);
  // Sparse/large headings can be omitted by full-page segmentation. Read the
  // actual top region again when a US document has no recognized title.
  if(dimensions&&!/^\s*(?:RECEIPT|INVOICE)\s*$/im.test(data.text)&&/USD|\bEIN\b/.test(data.text)&&!/纳税人|发票/.test(data.text)){
    try{await worker.reinitialize('eng');await worker.setParameters({tessedit_pageseg_mode:'6'});
      const crop=document.createElement('canvas');crop.width=dimensions.width;crop.height=Math.round(dimensions.height*.17);
      const bitmap=image instanceof Blob?await createImageBitmap(image):null;crop.getContext('2d').drawImage(bitmap||image,0,0);bitmap?.close();
      const {data:heading}=await worker.recognize(crop,{}, {text:true});crop.width=crop.height=0;
      const title=heading.text.match(/\b(RECEIPT|INVOICE)\b/i)?.[1];if(title)data.text=title+'\n'+data.text;
    }finally{await worker.reinitialize('chi_sim+eng');await worker.setParameters({tessedit_pageseg_mode:'3',preserve_interword_spaces:'1',user_defined_dpi:'300'});}
  }
  return data;
}
export async function extractFile(file,country,onProgress){
  if(file.size>25*1024*1024)throw new Error('File exceeds 25 MB.');
  const bytes=await file.arrayBuffer();
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='xml')return {...parseXML(await file.text(),country),hash};
  if(ext==='pdf'){
    const pdfjs=await import('pdfjs-dist'); const port=await pdfWorker();const worker=new pdfjs.PDFWorker({port});
    let pdf;
    try {
      pdf=await pdfjs.getDocument({data:new Uint8Array(bytes),worker,isEvalSupported:false,useSystemFonts:true,useWorkerFetch:false,BinaryDataFactory:LocalPDFData}).promise;
      if(pdf.numPages>30)throw new Error('PDF exceeds 30 pages. Split it into smaller files.');
      let texts=[],confidences=[],usedOCR=false;
      for(let n=1;n<=pdf.numPages;n++){
        onProgress?.(`Reading PDF ${n}/${pdf.numPages}`,0);
        const page=await pdf.getPage(n), content=await page.getTextContent();
        let lastY=null,t='';
        for(const item of content.items){if(!('str'in item))continue;const y=Math.round(item.transform[5]);t+=(lastY!==null&&Math.abs(y-lastY)>3?'\n':' ')+item.str;if(item.hasEOL)t+='\n';lastY=y;}
        if(t.replace(/\s/g,'').length<35){
          const base=page.getViewport({scale:1});const ops=await page.getOperatorList(),images=ops.fnArray.flatMap((op,i)=>op===pdfjs.OPS.paintImageXObject?[ops.argsArray[i]]:[]);
          const scan=images.length===1&&Math.abs(images[0][1]/images[0][2]-base.width/base.height)<0.02?images[0]:null;
          const nativeScale=scan?Math.max(scan[1]/base.width,scan[2]/base.height):3;
          const scale=Math.min(Math.max(nativeScale,1),3000/Math.max(base.width,base.height));const viewport=page.getViewport({scale});
          const canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
          await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
          const data=await recognize(canvas,onProgress,canvas);t=data.text;confidences.push(data.confidence);usedOCR=true;canvas.width=canvas.height=0;
        }
        texts.push(t);page.cleanup();
      }
      return {...parseText(texts.join('\n'),country),hash,extraction:usedOCR?'pdf-ocr':'pdf-text',pageCount:pdf.numPages,ocrConfidence:confidences.length?Math.min(...confidences):null};
    }finally{await pdf?.destroy();worker.destroy();port.terminate();}
  }
  if(['png','jpg','jpeg','webp','bmp'].includes(ext)){
    const bitmap=await createImageBitmap(file),dimensions={width:bitmap.width,height:bitmap.height};try{if(bitmap.width*bitmap.height>40000000)throw new Error('Image exceeds 40 megapixels. Resize before uploading.');}finally{bitmap.close();}
    const data=await recognize(file,onProgress,dimensions);return {...parseText(data.text,country),hash,extraction:'image-ocr',ocrConfidence:data.confidence};
  }
  throw new Error('Unsupported file. Use PDF, PNG, JPG, WEBP, BMP, or XML.');
}
