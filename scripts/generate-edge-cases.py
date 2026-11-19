from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from pypdf import PdfWriter
root=Path(__file__).resolve().parents[1]
out=root/'samples'/'edge-cases';out.mkdir(exist_ok=True,parents=True)
im=Image.open(root/'samples/regression-100/054-US-image-ocr.png')
im.save(out/'invoice.webp',quality=95);im.save(out/'invoice.bmp')
(out/'broken.xml').write_text('<Invoice><SellerName>Broken</Invoice>',encoding='utf-8')
(out/'broken.pdf').write_bytes(b'%PDF-1.7\nThis is deliberately not a valid PDF.\n')
c=canvas.Canvas(str(out/'31-pages.pdf'))
for i in range(31):c.drawString(50,700,'Synthetic page limit test '+str(i+1));c.showPage()
c.save()
w=PdfWriter();w.append(root/'samples/regression-100/076-US-pdf-ocr.pdf');w.append(root/'samples/regression-100/076-US-pdf-ocr.pdf');w.write(out/'two-pages.pdf')
print('Created WEBP, BMP, invalid XML/PDF, and 31-page boundary fixtures.')
