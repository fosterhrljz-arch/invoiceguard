import { XMLParser, XMLValidator } from 'fast-xml-parser';
import {money,normalizeID,types,dateValue} from './core.js';

// Match services/items first; merchant names are a fallback, not a reason to
// classify a hotel's restaurant bill as a room charge or a stationer as travel.
const rules=[
 ['software',/软件|信息技术服务|技术服务费|云服务|订阅|\b(?:software|saas|cloud hosting|subscription)\b/i],
 ['meals',/餐饮|餐费|餐厅|饮食|食品|咖啡|工作餐|\b(?:restaurant|coffee|cafe|dining|meals?|catering|lunch|dinner|food)\b/i],
 ['hotels',/住宿|客房|房费|酒店|宾馆|旅馆|\b(?:hotels?|lodging|room nights?|accommodation)\b/i],
 ['transportation',/客运|运输服务|交通|出租车|网约车|打车|车票|机票|滴滴|燃油|汽油|柴油|加油|停车|通行费|高速公路|高铁|火车|\b(?:taxi|uber|lyft|train|flight|airline|transport|parking|toll|gasoline|fuel|rail)\b/i],
 ['office',/办公|文具|打印|复印|耗材|纸张|\b(?:office|stationery|printer|paper|supplies|toner)\b/i]
];
export function categorize(text){const s=String(text??'').normalize('NFKC').replace(/(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g,'');return rules.find(([,re])=>re.test(s))?.[0]||'other';}
const countryValue=value=>{const s=String(value||'').trim().toUpperCase();return /^(CN|CHN|CHINA|中国|中华人民共和国)$/.test(s)?'CN':/^(US|USA|U\.S\.?|UNITED STATES(?: OF AMERICA)?|美国)$/.test(s)?'US':s;};
export function parseText(text,countryHint='US'){
 const rawText=String(text).replace(/\r/g,'');
 // Keep original text for inspection; normalize only the parsing copy.
 const source=rawText.normalize('NFKC').replace(/(?<=[\u3400-\u9fff])[^\S\n]+(?=[\u3400-\u9fff])/g,'').replace(/[：]/g,':').replace(/[〈《]/g,'(').replace(/[〉》]/g,')').replace(/\)+/g,')').replace(/(\d)\.[ \t]+(\d{2})\b/g,'$1.$2');
 const label=(names,body=source)=>{for(const separator of ['[ \\t]*[:#;][ \\t]*','[ \\t]+'])for(const name of names){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const m=body.match(new RegExp('(?:^|\\n| {2,})[ \\t]*'+escaped+separator+'([^\\n]*)','i'));if(m)return m[1].split(/\s{3,}(?=[A-Za-z\u3400-\u9fff].*[:：])/)[0].trim();}return '';};
 const country=/发票|纳税人|统一社会信用|人民币|\bCNY\b|\bRMB\b/i.test(source)?'CN':/\bUSD\b|\bEIN\b|\$|\bUS receipt\b/i.test(source)?'US':countryHint;
 const section=(start,end)=>source.match(new RegExp(start+'[\\s\\S]*?(?='+end+'|$)'))?.[0]||'';
 const buyerBlock=section('购买方(?:信息)?','销售方|货物|项目名称'),sellerBlock=section('销售方(?:信息)?','购买方|货物|项目名称|备注');
 const taxId=(value)=>normalizeID(value.match(/[0-9A-Z][0-9A-Z \-]{7,25}/i)?.[0]||value);
 const numeric=value=>{const match=value.replace(/^(?:USD|CNY|RMB)\s*/i,'').match(/^[-(]?[¥￥$]?\s*\d[\d,]*(?:\.\d{1,4})?\)?/);return match?money(match[0]):null;};
 const item=label(['Description','Item','项目名称','项目','内容']);
 const itemLines=source.split('\n').filter(x=>/[*＊].+[*＊]|服务[*＊]|服务费|住宿费|餐饮费|办公用品|停车费/.test(x)).join(' ');
 const vendor=label(['Seller Name','Seller','Vendor','Merchant','销售方名称','销方名称'])||label(['名称','和名称'],sellerBlock);
 const buyer=label(['Buyer Name','Buyer','Bill To','Customer','购买方名称','购方名称'])||label(['名称'],buyerBlock);
 let total=label(['Grand Total','Total Due','Amount Due','Total','价税合计(小写)','价税合计','总计']);
 if(/小写/.test(total))total=total.split(/小写[)）:]*/).at(-1);
 if(!total)total=source.match(/(?:[（(]小写[）)]|小写:)\s*([¥￥$]?\s*[\d,.]+)/)?.[1]||'';
 const sumLine=source.match(/(?:^|\n)\s*合计\s+([¥￥]?\s*[\d,.]+)\s+([¥￥]?\s*[\d,.]+)/);
 const out={country,documentType:/增值税|电子发票|数电发票/.test(source)||(/发票号码/.test(source)&&/纳税人识别号|价税合计/.test(source))?'cn_vat':/receipt|收据|小票/i.test(source)?'receipt':/invoice/i.test(source)?'us_invoice':'other',
  currency:/\bUSD\b|\$/i.test(source)?'USD':/CNY|RMB|¥|￥|人民币/i.test(source)?'CNY':country==='CN'?'CNY':'USD',vendor,buyer,
  sellerTaxId:taxId(label(['Seller Tax ID','Seller EIN','Vendor EIN','EIN','销售方纳税人识别号','销方税号'])||label(['统一社会信用代码/纳税人识别号','统一社会信用代码','纳税人识别号'],sellerBlock)),
  buyerTaxId:taxId(label(['Buyer Tax ID','Buyer EIN','购买方纳税人识别号','购方税号'])||label(['统一社会信用代码/纳税人识别号','统一社会信用代码','纳税人识别号'],buyerBlock)),
  invoiceNumber:label(['Invoice Number','Invoice No.','Invoice No','Invoice #','Receipt Number','Receipt No','发票号码','票据号码']).split(/开票日期\s*:/)[0].replace(/\s+/g,''),
  invoiceCode:label(['Invoice Code','发票代码']).replace(/\s+/g,''),date:dateValue(label(['Invoice Date','Date','开票日期','日期'])||source),
  subtotal:numeric(label(['Subtotal','Net Amount','不含税金额','合计金额','金额合计'])||sumLine?.[1]||''),
  tax:numeric(label(['Sales Tax','Tax','VAT','合计税额','税额'])||sumLine?.[2]||''),
  tip:numeric(label(['Tip','小费']))??0,discount:numeric(label(['Discount','折扣']))??0,total:numeric(total),
  category:categorize(item||itemLines||vendor||source),description:item||itemLines,rawText,extraction:'text',reviewed:false,ackWarnings:false};
 return out;
}
export function parseXML(text,countryHint='US'){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('XML DTDs and entities are not supported.');
 if(XMLValidator.validate(text)!==true)throw new Error('Invalid XML. Check the source file.');
 const tree=new XMLParser({ignoreAttributes:false,parseTagValue:false,parseAttributeValue:false,removeNSPrefix:true,trimValues:true,processEntities:true}).parse(text);
 const leaves=[];const walk=(obj,path='')=>{if(Array.isArray(obj)){obj.forEach(x=>walk(x,path));return;}for(const[key,v]of Object.entries(obj||{})){const p=path?path+'.'+key:key;if(v&&typeof v==='object')walk(v,p);else leaves.push([key.toLowerCase(),String(v),p.toLowerCase().replace(/\.#text$/,'')]);}};walk(tree);
 const get=aliases=>{for(const a of aliases){const key=a.toLowerCase();const hit=leaves.find(([k,,p])=>k===key||p===key||p.endsWith('.'+key));if(hit)return hit[1];}return '';};
 const currency=get(['DocumentCurrencyCode','InvoiceCurrencyCode','Currency','CurrencyCode','@_currencyID']).toUpperCase();
 const sellerId=get(['SellerTaxID','Seller.TaxId','SellerTaxpayerId','AccountingSupplierParty.Party.PartyTaxScheme.CompanyID','SellerTradeParty.SpecifiedTaxRegistration.ID','销方税号']);
 const explicit=get(['Seller.Country','Seller.CountryCode','Supplier.CountryCode','AccountingSupplierParty.Party.PostalAddress.Country.IdentificationCode','SellerTradeParty.PostalTradeAddress.CountryID','Invoice.Country','Invoice.CountryCode','Country','CountryCode']);
 // SellerTaxID / BuyerTaxID / TaxInclusiveTotalAmount are country-neutral.
 const country=countryValue(explicit)||(currency==='USD'?'US':currency==='CNY'||currency==='RMB'?'CN':/发票|<\w*:?(?:Fapiao|DigitalInvoice)\b/i.test(text)||normalizeID(sellerId).length===18?'CN':/^\d{2}-?\d{7}$/.test(sellerId)?'US':countryHint);
 const fields={vendor:['SellerName','Seller.Name','SupplierName','AccountingSupplierParty.Party.PartyLegalEntity.RegistrationName','AccountingSupplierParty.Party.PartyName.Name','SellerTradeParty.Name','销方名称'],buyer:['BuyerName','Buyer.Name','CustomerName','AccountingCustomerParty.Party.PartyLegalEntity.RegistrationName','AccountingCustomerParty.Party.PartyName.Name','BuyerTradeParty.Name','购方名称'],
 buyerTaxId:['BuyerTaxId','Buyer.TaxId','BuyerTaxpayerId','AccountingCustomerParty.Party.PartyTaxScheme.CompanyID','BuyerTradeParty.SpecifiedTaxRegistration.ID','购方税号'],invoiceNumber:['InvoiceNumber','InvoiceNo','DigitalInvoiceNumber','Invoice.ID','ExchangedDocument.ID','发票号码'],invoiceCode:['InvoiceCode','发票代码'],date:['IssueDate','InvoiceDate','开票日期'],
 subtotal:['TotalAmWithoutTax','TotalAmountWithoutTax','LegalMonetaryTotal.TaxExclusiveAmount','TaxExclusiveTotalAmount','Subtotal','TotalAmount','AmountWithoutTax'],tax:['TotalTaxAm','TotalTaxAmount','TotalTax','TaxTotal.TaxAmount','TaxAmount','Tax'],total:['TotalTax-includedAmount','LegalMonetaryTotal.PayableAmount','TaxInclusiveTotalAmount','TotalAmountWithTax','GrandTotal','TotalWithTax','Total'],tip:['Tip'],discount:['Discount'],description:['Description','ItemName','GoodsName','InvoiceLine.Item.Name']};
 const out=parseText('',country);out.country=country;out.currency=currency==='RMB'?'CNY':currency||(country==='CN'?'CNY':'USD');out.sellerTaxId=normalizeID(sellerId);
 for(const[k,aliases]of Object.entries(fields)){const v=get(aliases);if(v!=='')out[k]=['subtotal','tax','total','tip','discount'].includes(k)?money(v):k==='date'?dateValue(v):k==='buyerTaxId'?normalizeID(v):v;}
 out.documentType=get(['DocumentType'])||(country==='CN'?'cn_vat':'us_invoice');if(!types.includes(out.documentType))out.documentType=country==='CN'?'cn_vat':'us_invoice';
 out.category=categorize(out.description||out.vendor);out.rawText=text;out.extraction='xml';return out;
}
