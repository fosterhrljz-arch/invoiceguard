import { usccCheckDigit } from './core.js';
export const cnBuyer='91310000MA1FL0000'+usccCheckDigit('91310000MA1FL0000');
export const cnSeller='91110108MA0000000'+usccCheckDigit('91110108MA0000000');
export function emptyWorkspace(){return {schemaVersion:1,companies:[],batches:[],documents:[]};}
export function sampleWorkspace(){
 const companies=[{id:'company-us',name:'Northstar Studio LLC',country:'US',taxId:'12-3456789',aliases:['Northstar Studio'],sample:true},{id:'company-cn',name:'星河科技（上海）有限公司',country:'CN',taxId:cnBuyer,aliases:['星河科技(上海)有限公司'],sample:true}];
 const batches=[{id:'batch-nov',name:'November team expenses',companyId:'company-us',employee:'Alex Morgan',purpose:'Client meetings & team operations',status:'draft',createdAt:'2026-11-01T09:00:00Z',sample:true},{id:'batch-oct',name:'October archive',companyId:'company-us',employee:'Alex Morgan',purpose:'Previous travel',status:'reimbursed',createdAt:'2026-10-01T09:00:00Z',sample:true},{id:'batch-cn',name:'上海差旅 · November',companyId:'company-cn',employee:'陈晨',purpose:'客户拜访与差旅',status:'draft',createdAt:'2026-11-01T09:00:00Z',sample:true}];
 const base={country:'US',currency:'USD',documentType:'receipt',companyId:'company-us',batchId:'batch-nov',buyer:'',buyerTaxId:'',sellerTaxId:'',invoiceCode:'',tip:0,discount:0,reviewed:true,ackWarnings:false,extraction:'sample',sample:true,notes:''};
 const documents=[
 {id:'demo-1',vendor:'Blue Bottle Coffee',category:'meals',invoiceNumber:'BB-1083',date:'2026-11-03',subtotal:48,tax:4.2,total:52.2},
 {id:'demo-2',vendor:'Uber',category:'transportation',invoiceNumber:'UB-7712',date:'2026-11-03',subtotal:34.5,tax:0,total:34.5},
 {id:'demo-3',vendor:'The Hoxton Hotel',category:'hotels',invoiceNumber:'HX-2408',date:'2026-11-02',subtotal:420,tax:63,total:483},
 {id:'demo-4',vendor:'Staples',category:'office',invoiceNumber:'ST-0911',date:'2026-11-04',subtotal:89,tax:7.79,total:106.79},
 {id:'demo-5',vendor:'Figma',category:'software',documentType:'us_invoice',invoiceNumber:'FG-6012',date:'2026-11-01',subtotal:45,tax:0,total:45,buyer:'Northstar Studio LLC',sellerTaxId:'12-34567',reviewed:false},
 {id:'demo-6',vendor:'Corner Café',category:'meals',invoiceNumber:'CC-2026',date:'2026-11-05',subtotal:26,tax:2.28,total:28.28,reviewed:false},
 {id:'demo-7',vendor:'Uber',category:'transportation',invoiceNumber:'UB-OLD-33',date:'2026-10-22',subtotal:28,tax:0,total:28},
 {id:'demo-history',vendor:'Uber',category:'transportation',invoiceNumber:'UB-OLD-33',date:'2026-10-22',subtotal:28,tax:0,total:28,batchId:'batch-oct'},
 {id:'demo-cn1',country:'CN',currency:'CNY',documentType:'cn_vat',companyId:'company-cn',batchId:'batch-cn',vendor:'上海云海酒店有限公司',buyer:'星河科技（上海）有限公司',buyerTaxId:cnBuyer,sellerTaxId:cnSeller,category:'hotels',invoiceNumber:'20263100000000000001',date:'2026-11-02',subtotal:800,tax:48,total:848},
 {id:'demo-cn2',country:'CN',currency:'CNY',documentType:'cn_vat',companyId:'company-cn',batchId:'batch-cn',vendor:'上海办公用品有限公司',buyer:'星河科技（上海）有限公司',buyerTaxId:cnBuyer.slice(0,17)+'Z',sellerTaxId:cnSeller,category:'office',invoiceNumber:'20263100000000000002',date:'2026-11-04',subtotal:200,tax:26,total:226,reviewed:false}
 ].map((d,i)=>({...base,...d,filename:`sample-${i+1}.xml`,createdAt:'2026-11-05T09:00:00Z',hash:'',rawText:sampleXML({...base,...d})}));
 return {schemaVersion:1,companies,batches,documents};
}
export function sampleXML(d){const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); return `<?xml version="1.0" encoding="UTF-8"?>\n<Invoice>\n  <!-- SYNTHETIC SAMPLE: not a real invoice -->\n${Object.entries({Country:d.country,DocumentType:d.documentType,InvoiceNumber:d.invoiceNumber,InvoiceCode:d.invoiceCode,IssueDate:d.date,SellerName:d.vendor,SellerTaxId:d.sellerTaxId,BuyerName:d.buyer,BuyerTaxId:d.buyerTaxId,Currency:d.currency,Subtotal:d.subtotal,Tax:d.tax,Tip:d.tip,Discount:d.discount,GrandTotal:d.total,Description:d.category}).map(([k,v])=>`  <${k}>${esc(v)}</${k}>`).join('\n')}\n</Invoice>`;}
