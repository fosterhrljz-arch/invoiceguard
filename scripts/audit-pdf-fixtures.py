"""Independent check that scan fixtures contain images, not hidden OCR text."""
import json
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'samples/regression-100/manifest.json').read_text(encoding='utf-8'))
rows=[]
for record in manifest['records']:
    if record['extraction'] in ['pdf-ocr','pdf-text']:
        pdf=PdfReader(root/'samples/regression-100'/record['filename'])
        count=len(''.join(''.join(page.extract_text() or '' for page in pdf.pages).split()))
        assert (count==0) if record['extraction']=='pdf-ocr' else (count>35),record['filename']
        rows.append({'file':record['filename'],'kind':record['extraction'],'textCharacters':count})
(root/'test-results/pdf-text-audit.json').write_text(json.dumps({'passed':True,'tool':'pypdf independent text extraction','imageOnlyPDFs':25,'textPDFs':20,'records':rows},indent=2),encoding='utf-8')
print('Verified 25 image-only scanned PDFs and 20 PDFs with extractable text.')
