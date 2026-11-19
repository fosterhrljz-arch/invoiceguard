"""Deterministic synthetic invoices. Ground truth is written before extraction.
No samples contain real transactions, real businesses, or real personal data.
Requires Pillow and reportlab (development only, never needed to open the app).
"""
from pathlib import Path
import json, hashlib, shutil, random, io
from xml.sax.saxutils import escape
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'samples'/'regression-100';OUT.mkdir(parents=True,exist_ok=True)
FONT_CN=Path('C:/Windows/Fonts/simsun.ttc');FONT_EN=Path('C:/Windows/Fonts/arial.ttf')
pdfmetrics.registerFont(TTFont('FixtureCN',str(FONT_CN),subfontIndex=0))
pdfmetrics.registerFont(TTFont('FixtureEN',str(FONT_EN)))
alphabet='0123456789ABCDEFGHJKLMNPQRTUWXY';weights=[1,3,9,27,19,26,16,17,20,29,25,13,8,24,10,30,28]
def uscc(p):return p+alphabet[(31-sum(alphabet.index(c)*w for c,w in zip(p,weights))%31)%31]
CNBUY=uscc('91310000MA1FL0000');CNSELL=uscc('91110108MA0000000')
companies=[{'name':'Northstar Studio LLC','country':'US','taxId':'12-3456789'}, {'name':'星河科技（上海）有限公司','country':'CN','taxId':CNBUY}]
categories=['meals','transportation','hotels','office','software']
items_cn=['*餐饮服务*工作餐','*运输服务*市内出租车费','*住宿服务*客房住宿费','*办公用品*打印纸及文具','*信息技术服务*软件订阅']
items_en=['Business lunch catering','Airport taxi transportation','Hotel room nights','Office stationery and printer paper','Software subscription']
vendors_cn=['明月餐饮有限公司','远行运输有限公司','青山酒店有限公司','晨光文具有限公司','云杉软件有限公司']
vendors_en=['Juniper Cafe LLC','Summit Taxi LLC','Cedar Hotel LLC','Maple Office Supply LLC','Pine Software LLC']
records=[]
for i in range(100):
 cn=i%2==0;c=(i//2)%5;kind='xml' if i<30 else 'pdf-text' if i<50 else 'image-ocr' if i<75 else 'pdf-ocr'
 d={'country':'CN' if cn else 'US','currency':'CNY' if cn else 'USD','documentType':'cn_vat' if cn else 'receipt' if i%6==1 else 'us_invoice','vendor':(vendors_cn if cn else vendors_en)[c], 'buyer':companies[cn]['name'],'buyerTaxId':companies[cn]['taxId'],'sellerTaxId':CNSELL if cn else '98-7654321', 'invoiceNumber':str(20263100000000000000+i) if cn else f'INV-2026-{i+1:04d}','invoiceCode':'','date':f'2026-10-{i%27+1:02d}','subtotal':round(50+i*7.25,2),'tax':round((50+i*7.25)*(.06 if cn else .0825),2),'tip':0,'discount':0,'category':categories[c],'description':(items_cn if cn else items_en)[c]}
 d['total']=round(d['subtotal']+d['tax'],2)
 if d['documentType']=='receipt':d['buyer']='';d['buyerTaxId']='';d['sellerTaxId']=''
 issues=[]
 if i in [2,32,52,78]:d['sellerTaxId']=CNSELL[:-1]+('0' if CNSELL[-1]!='0' else '1');issues=['invalid_seller_tax']
 if i in [5,35,55,79]:d['sellerTaxId']='98-76543';issues=['invalid_seller_tax']
 if i in [8,38,58,82]:d['buyerTaxId']='';issues=['invalid_buyer_tax']
 if i in [11,41,61,85]:d['vendor']='';issues=['missing_vendor']
 if i in [14,44,64,88]:d['total']+=11;issues=['amount_mismatch']
 if i in [17,47,67,91]:d['date']='';issues=['invalid_date']
 if i in [20,70,92]:d['invoiceNumber']='';issues=['missing_number']
 records.append({'id':i+1,'expected':d,'extraction':kind,'expectedIssues':issues,'quality':'light-scan' if kind in ['image-ocr','pdf-ocr'] and i%7==0 else 'clean'})
# Cross-format repeats test business-key matching; exact copies test SHA-256 matching.
for target,source in [(90,0),(93,3),(94,4)]:
 records[target]['expected']=dict(records[source]['expected']);records[target]['expectedIssues']=list(records[source]['expectedIssues']);records[target]['duplicateOf']=source+1
for target,source in [(28,0),(29,1),(73,51),(74,50),(98,76),(99,77)]:
 records[target]['expected']=dict(records[source]['expected']);records[target]['expectedIssues']=list(records[source]['expectedIssues']);records[target]['duplicateOf']=source+1;records[target]['exactCopy']=True;records[target]['quality']=records[source]['quality']
for r in records:
 if r.get('duplicateOf'):
  r['expectedIssues'].append('duplicate');records[r['duplicateOf']-1]['expectedIssues'].append('duplicate')
 r['expectedIssues']=list(dict.fromkeys(r['expectedIssues']))

def layout(d):
 cn=d['country']=='CN';w,h=(1600,1100) if cn else (1240,1530)
 ops=[]
 def t(x,y,s,size=28,color='#252525'):ops.append(('text',x,y,str(s),size,color))
 def line(x,y,x2,y2):ops.append(('line',x,y,x2,y2))
 if cn:
  t(450,35,'电子发票（普通发票）',44,'#923e3e');t(55,95,'样本 · 虚构交易 · 仅用于软件测试',24,'#777777')
  t(55,142,'发票号码: '+d['invoiceNumber'],30);t(1050,142,'开票日期: '+d['date'],28)
  line(45,198,1555,198);t(55,215,'购买方信息',27)
  t(55,260,'名称: '+d['buyer'],32);t(55,310,'统一社会信用代码/纳税人识别号: '+d['buyerTaxId'],30)
  line(45,365,1555,365);t(55,385,'项目名称',28);t(820,385,'数量',28);t(1000,385,'金额',28);t(1230,385,'税率',28);t(1410,385,'税额',28)
  line(45,432,1555,432);t(55,460,d['description'],30);t(840,460,'1',28);t(1000,460,f"{d['subtotal']:.2f}",28);t(1240,460,'6%',28);t(1410,460,f"{d['tax']:.2f}",28)
  t(55,570,'合计',30);t(1000,570,f"¥{d['subtotal']:.2f}",30);t(1400,570,f"¥{d['tax']:.2f}",30)
  line(45,620,1555,620);t(55,645,'价税合计（小写）: '+f"¥{d['total']:.2f}",34);t(1110,650,'币种: CNY',28)
  line(45,705,1555,705);t(55,725,'销售方信息',27);t(55,770,'名称: '+d['vendor'],32)
  t(55,825,'统一社会信用代码/纳税人识别号: '+d['sellerTaxId'],30)
  line(45,885,1555,885);t(55,915,'备注: 本单据不是有效税务发票，不可用于实际报销。',25,'#777777');t(55,985,'开票人: 测试员',25)
 else:
  t(60,40,'RECEIPT' if d['documentType']=='receipt' else 'INVOICE',50,'#234d50')
  t(60,112,'Seller: '+d['vendor'],32);t(60,160,'Seller EIN: '+d['sellerTaxId'],26)
  t(60,210,'100 Example Avenue, Suite 200',25);t(60,247,'Denver, CO 80202, United States',25)
  t(60,310,'Invoice Number: '+d['invoiceNumber'],29);t(60,355,'Invoice Date: '+d['date'],29)
  line(60,410,1180,410);t(60,440,'Bill To: '+d['buyer'],30);t(60,490,'Buyer EIN: '+d['buyerTaxId'],26)
  t(60,540,'Currency: USD',26);line(60,605,1180,605)
  t(60,630,'DESCRIPTION',25);t(800,630,'QTY',25);t(1010,630,'AMOUNT',25)
  t(60,690,'Description: '+d['description'],27);t(820,740,'1',27);t(1010,740,f"${d['subtotal']:.2f}",27)
  line(60,805,1180,805);t(720,850,'Subtotal: '+f"${d['subtotal']:.2f}",30);t(720,910,'Sales Tax: '+f"${d['tax']:.2f}",30)
  t(720,990,'Total: '+f"${d['total']:.2f}",36);line(60,1060,1180,1060)
  t(60,1110,'Payment: Corporate card ending 0000',26);t(60,1170,'Thank you for your business.',26)
  t(60,1310,'SYNTHETIC SAMPLE - NOT A VALID TAX DOCUMENT',23,'#777777');t(60,1360,'Fictional transaction for InvoiceGuard regression testing.',22,'#777777')
 return w,h,ops

def draw_image(d,quality):
 w,h,ops=layout(d);im=Image.new('RGB',(w,h),'white');dr=ImageDraw.Draw(im)
 for op in ops:
  if op[0]=='line':dr.line(op[1:],fill='#aaaaaa',width=2)
  else:
   _,x,y,s,size,color=op;dr.text((x,y),s,font=ImageFont.truetype(str(FONT_CN if d['country']=='CN' else FONT_EN),size),fill=color)
 if quality=='light-scan':im=im.rotate(.35,resample=Image.Resampling.BICUBIC,fillcolor='white').filter(ImageFilter.GaussianBlur(.25))
 return im

def draw_pdf(d,p,scan,quality):
 w,h,ops=layout(d);scale=.45;c=canvas.Canvas(str(p),pagesize=(w*scale,h*scale),pageCompression=1)
 c.setTitle('Synthetic InvoiceGuard test invoice');c.setAuthor('InvoiceGuard test suite')
 if scan:c.drawImage(ImageReader(draw_image(d,quality)),0,0,width=w*scale,height=h*scale)
 else:
  for op in ops:
   if op[0]=='line':_,x,y,x2,y2=op;c.setStrokeColorRGB(.65,.65,.65);c.line(x*scale,(h-y)*scale,x2*scale,(h-y2)*scale)
   else:
    _,x,y,s,size,color=op;c.setFont('FixtureCN' if d['country']=='CN' else 'FixtureEN',size*scale);c.setFillColor(color);c.drawString(x*scale,(h-y-size)*scale,s)
 c.showPage();c.save()

def xml(d,i):
 if i%4==1 and d['country']=='US':
  return f'''<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:cbc" xmlns:cac="urn:cac"><cbc:ID>{d['invoiceNumber']}</cbc:ID><cbc:IssueDate>{d['date']}</cbc:IssueDate><cbc:DocumentCurrencyCode>USD</cbc:DocumentCurrencyCode><DocumentType>{d['documentType']}</DocumentType><cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>{d['vendor']}</cbc:Name></cac:PartyName><cac:PartyTaxScheme><cbc:CompanyID>{d['sellerTaxId']}</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty><cac:AccountingCustomerParty><cac:Party><cac:PartyName><cbc:Name>{d['buyer']}</cbc:Name></cac:PartyName><cac:PartyTaxScheme><cbc:CompanyID>{d['buyerTaxId']}</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty><cac:InvoiceLine><cac:Item><cbc:Description>{d['description']}</cbc:Description></cac:Item></cac:InvoiceLine><cac:TaxTotal><cbc:TaxAmount currencyID="USD">{d['tax']}</cbc:TaxAmount></cac:TaxTotal><cac:LegalMonetaryTotal><cbc:TaxExclusiveAmount currencyID="USD">{d['subtotal']}</cbc:TaxExclusiveAmount><cbc:PayableAmount currencyID="USD">{d['total']}</cbc:PayableAmount></cac:LegalMonetaryTotal></Invoice>'''
 mapping={'SellerName':'vendor','BuyerName':'buyer','SellerTaxID':'sellerTaxId','BuyerTaxID':'buyerTaxId','InvoiceNumber':'invoiceNumber','InvoiceDate':'date','Currency':'currency','DocumentType':'documentType','Subtotal':'subtotal','TaxAmount':'tax','TaxInclusiveTotalAmount':'total','Description':'description'}
 return '<?xml version="1.0" encoding="UTF-8"?><Invoice>'+''.join(f'<{tag}>{escape(str(d[key]))}</{tag}>' for tag,key in mapping.items())+'</Invoice>'

for i,r in enumerate(records):
 kind=r['extraction'];ext='xml' if kind=='xml' else 'png' if kind=='image-ocr' and i%3 else 'jpg' if kind=='image-ocr' else 'pdf'
 if r.get('exactCopy'):ext=Path(records[r['duplicateOf']-1]['filename']).suffix[1:]
 r['filename']=f"{i+1:03d}-{r['expected']['country']}-{kind}.{ext}";p=OUT/r['filename']
 if r.get('exactCopy'):shutil.copyfile(OUT/records[r['duplicateOf']-1]['filename'],p)
 elif kind=='xml':p.write_text(xml(r['expected'],i),encoding='utf-8')
 elif kind=='image-ocr':draw_image(r['expected'],r['quality']).save(p,quality=88)
 else:draw_pdf(r['expected'],p,kind=='pdf-ocr',r['quality'])
 r['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();r['bytes']=p.stat().st_size
(OUT/'manifest.json').write_text(json.dumps({'description':'100 synthetic realistic-layout invoices. Ground truth from generator inputs, never OCR output. 50 CN / 50 US; 30 XML, 20 text PDFs, 25 images, 25 image-only scanned PDFs.','companies':companies,'records':records},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Created {len(records)} invoices in {OUT}')
