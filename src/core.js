

export const categories = ['meals', 'transportation', 'hotels', 'office', 'software', 'other'];
export const types = ['cn_vat', 'us_invoice', 'receipt', 'other'];
const alphabet = '0123456789ABCDEFGHJKLMNPQRTUWXY';
const weights = [1,3,9,27,19,26,16,17,20,29,25,13,8,24,10,30,28];
export const normalizeID = x => String(x ?? '').normalize('NFKC').toUpperCase().replace(/[\s-]/g, '');
export const normalizeName = x => String(x ?? '').normalize('NFKC').toLowerCase().replace(/[\s.,，。()（）“”‘’《》〈〉\-]/g, '');
export function usccCheckDigit(prefix) { return alphabet[(31 - [...prefix].reduce((n,c,i)=>n+alphabet.indexOf(c)*weights[i],0)%31)%31]; }
export function usccProblem(id) {
 const v=normalizeID(id);
 if(!v)return 'Missing USCC / 缺少统一社会信用代码';
 if(v.length!==18)return 'USCC must contain 18 characters / 统一社会信用代码须为18位';
 if(!/^[0-9A-HJ-NPQRTUWXY]{18}$/.test(v))return 'USCC contains forbidden characters (I, O, S, V, Z) / 包含非法字符';
 if(!/^[1-9ANY][0-9][0-9]{6}/.test(v)||v.slice(2,8)==='000000')return 'Invalid registration authority, entity type or administrative region structure / 登记机关、机构类型或行政区划格式有误';
 if(usccCheckDigit(v.slice(0,17))!==v[17])return 'USCC checksum mismatch / 统一社会信用代码校验位不匹配';
 return '';
}
export function validUSCC(id) {return !usccProblem(id);}
export function validEIN(id) { return /^\d{2}-?\d{7}$/.test(String(id).trim()) && !/^0{2}/.test(id) && !/^\d{2}-?0{7}$/.test(id); }
export function money(value) {
  if (value===null || value===undefined || String(value).trim()==='') return null;
  const v=String(value).trim().replace(/[,，¥￥$\s]/g,'').replace(/^\((.*)\)$/,'-$1');
  if (!/^-?\d+(\.\d{1,4})?$/.test(v)) return null;
  return Math.round(Number(v)*100)/100;
}
export function validDate(value) { if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')) return false; const d=new Date(value+'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0,10)===value; }
export function dateValue(text) { let m=String(text).match(/(20\d{2})[年/.-](\d{1,2})[月/.-](\d{1,2})/); if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`; m=String(text).match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/); return m?`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`:''; }
export {categorize,parseText,parseXML} from './parsing.js';
export function validate(doc,company,all=[]) {
  const issues=[]; const add=(code,severity='error',detail='')=>issues.push({code,severity,detail});
  if(doc.excluded)return issues;
  if(doc.processingError)add('processing_error','error',doc.processingError);
  if(!company)add('missing_company');
  if(!doc.vendor?.trim())add('missing_vendor');
  if(!validDate(doc.date))add('invalid_date'); else if(doc.date>new Date().toISOString().slice(0,10))add('future_date','warning');
  if(money(doc.total)===null || money(doc.total)<=0)add('invalid_total');
  if(!['CNY','USD'].includes(doc.currency))add('invalid_currency');
  if(!['CN','US'].includes(doc.country))add('invalid_country');
  if(doc.country==='CN' && doc.documentType==='us_invoice' || doc.country==='US' && doc.documentType==='cn_vat')add('country_type_mismatch');
  if(!types.includes(doc.documentType)||doc.documentType==='other')add('unknown_type','warning');
  if(!categories.includes(doc.category)||doc.category==='other')add('unknown_category','warning');
  if(!doc.invoiceNumber && doc.documentType!=='receipt')add('missing_number');
  if(doc.invoiceNumber && doc.documentType==='cn_vat' && !/^\d{8}$|^\d{20}$/.test(doc.invoiceNumber))add('cn_invoice_number','warning');
  if(doc.documentType==='cn_vat'){
    if(!doc.buyer?.trim())add('missing_buyer');
    if(!validUSCC(doc.buyerTaxId))add('invalid_buyer_tax','error',usccProblem(doc.buyerTaxId));
    if(!validUSCC(doc.sellerTaxId))add('invalid_seller_tax','error',usccProblem(doc.sellerTaxId));
  }else {
    const check=doc.country==='CN'?validUSCC:validEIN;
    if(doc.buyerTaxId && !check(doc.buyerTaxId))add('invalid_buyer_tax');
    if(doc.sellerTaxId && !check(doc.sellerTaxId))add('invalid_seller_tax');
  }
  if(company){
    if(doc.buyer && ![company.name,...(company.aliases||[])].some(n=>normalizeName(n)===normalizeName(doc.buyer)))add('buyer_mismatch');
    if(doc.buyerTaxId && company.taxId && normalizeID(doc.buyerTaxId)!==normalizeID(company.taxId))add('tax_mismatch');
    if(doc.country!==company.country)add('cross_border','warning');
  }
  for(const k of ['subtotal','tax','tip','discount']) if(doc[k]!==null && doc[k]!=='' && doc[k]!==undefined && (money(doc[k])===null||money(doc[k])<0)) add('invalid_amount','error',k);
  if(money(doc.subtotal)!==null && money(doc.tax)!==null && money(doc.total)!==null){
    const expected=Math.round((money(doc.subtotal)+money(doc.tax)+(money(doc.tip)||0)-(money(doc.discount)||0))*100);
    if(Math.abs(expected-Math.round(money(doc.total)*100))>2)add('amount_mismatch');
  }else add('incomplete_breakdown','warning');
  if(doc.ocrConfidence!=null && doc.ocrConfidence<75)add('low_ocr','warning');
  if(!doc.reviewed)add('unreviewed','warning');
  const peers=all.filter(x=>x.id!==doc.id&&!x.excluded);
  const exact=peers.find(x=>(doc.hash&&x.hash===doc.hash)||(doc.invoiceNumber&&x.invoiceNumber===doc.invoiceNumber&&normalizeID(x.invoiceCode)===normalizeID(doc.invoiceCode)&&doc.country===x.country&& ((doc.sellerTaxId&&normalizeID(x.sellerTaxId)===normalizeID(doc.sellerTaxId)) || (doc.vendor && normalizeName(x.vendor)===normalizeName(doc.vendor)))));
  if(exact)add('duplicate','error',exact.filename+' · '+exact.batchId);
  else {const similar=peers.find(x=>doc.vendor&&normalizeName(x.vendor)===normalizeName(doc.vendor)&&validDate(doc.date)&&x.date===doc.date&&doc.currency===x.currency&&money(doc.total)!==null&&money(x.total)===money(doc.total)); if(similar)add('possible_duplicate','warning',similar.filename+' · '+similar.batchId);}
  return issues;
}
export function statusOf(doc,issues){return doc.excluded?'excluded':issues.some(i=>i.severity==='error')?'flagged':!doc.reviewed||(!doc.ackWarnings&&issues.some(i=>i.severity==='warning'))?'review':'ready';}
export function totals(docs){ const t={CNY:0,USD:0}; for(const d of docs)if(!d.excluded&&t[d.currency]!==undefined&&money(d.total)!==null)t[d.currency]+=Math.round(money(d.total)*100); return {CNY:t.CNY/100,USD:t.USD/100}; }
export function safePath(v){return String(v||'unnamed').normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/^\.+/,'_').slice(0,100);}
export function assertBackup(data){
  if(!data||data.schemaVersion!==1||!Array.isArray(data.companies)||!Array.isArray(data.batches)||!Array.isArray(data.documents))throw new Error('Unsupported backup. Expected InvoiceGuard schema version 1.');
  const unique=(a)=>a.every((x,i)=>typeof x.id==='string'&&x.id&&a.findIndex(y=>y.id===x.id)===i);
  if(!unique(data.companies)||!unique(data.batches)||!unique(data.documents))throw new Error('Backup has missing or duplicate record IDs.');
  if([...data.companies,...data.batches,...data.documents].some(x=>!/^[A-Za-z0-9-]{1,80}$/.test(x.id)))throw new Error('Backup has unsafe record IDs.');
  const textFields=['filename','mimeType','vendor','buyer','buyerTaxId','sellerTaxId','invoiceNumber','invoiceCode','date','category','documentType','country','currency','description','rawText','extraction','hash','notes','processingError'];
  if(data.documents.some(d=>textFields.some(k=>d[k]!=null&&typeof d[k]!=='string')||['subtotal','tax','tip','discount','total','ocrConfidence'].some(k=>d[k]!=null&&(typeof d[k]!=='number'||!Number.isFinite(d[k])))||['reviewed','ackWarnings','excluded'].some(k=>d[k]!=null&&typeof d[k]!=='boolean'))||data.companies.some(c=>(c.aliases||[]).some(a=>typeof a!=='string')||c.taxId!=null&&typeof c.taxId!=='string')||data.batches.some(b=>!['draft','approved','reimbursed'].includes(b.status)||['name','employee','purpose'].some(k=>typeof b[k]!=='string')))throw new Error('Backup contains invalid field types.');
  if(data.companies.some(c=>typeof c.name!=='string'||!['CN','US'].includes(c.country)||!Array.isArray(c.aliases||[]))||data.batches.some(b=>!data.companies.some(c=>c.id===b.companyId))||data.documents.some(d=>!data.batches.some(b=>b.id===d.batchId&&b.companyId===d.companyId)))throw new Error('Backup has invalid company or batch references.');
  return data;
}
