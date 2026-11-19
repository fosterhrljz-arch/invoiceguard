import React,{useEffect,useRef,useState} from 'react';
import {pdfWorker,LocalPDFData} from './offline.js';

// Render with the same local PDF engine as extraction. Native browser PDF
// plugins are unreliable in file:// Blob iframes, especially offline/headless.
export function PDFPreview({file,t}){
 const [pdf,setPDF]=useState(null),[page,setPage]=useState(1),[error,setError]=useState(''),[rendered,setRendered]=useState(0),canvas=useRef();
 useEffect(()=>{let active=true,port,worker,document,task;
  (async()=>{try{const pdfjs=await import('pdfjs-dist');port=await pdfWorker();if(!active){port.terminate();return;}worker=new pdfjs.PDFWorker({port});task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),worker,isEvalSupported:false,useSystemFonts:true,useWorkerFetch:false,BinaryDataFactory:LocalPDFData});document=await task.promise;if(!active){await document.destroy();return;}if(document.numPages>30)throw new Error('PDF exceeds the 30-page preview limit.');setPDF(document);}catch(e){if(active)setError(e.message);}})();
  return()=>{active=false;task?.destroy().catch(()=>{});worker?.destroy();port?.terminate();};
 },[file]);
 useEffect(()=>{if(!pdf)return;let active=true,renderTask;setRendered(0);
  (async()=>{try{const source=await pdf.getPage(page);if(!active)return;const base=source.getViewport({scale:1}),viewport=source.getViewport({scale:Math.min(1.5,1600/base.width)}),target=canvas.current;target.width=Math.round(viewport.width);target.height=Math.round(viewport.height);renderTask=source.render({canvasContext:target.getContext('2d'),viewport});await renderTask.promise;if(active){setRendered(page);source.cleanup();}}catch(e){if(active&&e.name!=='RenderingCancelledException')setError(e.message);}})();return()=>{active=false;renderTask?.cancel();};
 },[pdf,page]);
 return <div className="pdf-preview">{pdf&&<div className="pdf-controls"><button type="button" className="button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>{t('Previous','上一页')}</button><span>{t('Page','页')} {page} / {pdf.numPages}</span><button type="button" className="button" disabled={page>=pdf.numPages} onClick={()=>setPage(p=>p+1)}>{t('Next','下一页')}</button></div>}{error?<p role="alert">{t('PDF preview unavailable: ','PDF 预览不可用：')}{error}</p>:<>{rendered!==page&&<p role="status">{t('Rendering original PDF…','正在显示 PDF 原件…')}</p>}<canvas ref={canvas} data-rendered={rendered===page?'true':'false'} data-page={rendered} aria-label={t('Original PDF page','PDF 原件页面')}/></>}</div>;
}
