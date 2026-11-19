import http from 'node:http';
import { createReadStream,existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.INVOICEGUARD_PORT||5186);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf','.xml':'application/xml; charset=utf-8','.zip':'application/zip','.json':'application/json; charset=utf-8','.gz':'application/gzip'};
if(!existsSync(path.join(root,'index.html'))){console.error('No production build found. Run npm ci and npm run build first.');process.exit(1);}
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}
  const info=await stat(file);if(!info.isFile()){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  if(req.method==='HEAD')return res.end();createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is already in use. Open the existing InvoiceGuard window or stop its server first.`:e.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`InvoiceGuard is ready at http://127.0.0.1:${port}/\nOpen this address in Chrome or Edge. Keep this terminal open. Press Ctrl+C to stop.\nInvoices remain in your browser. First OCR use downloads free language models.`));
