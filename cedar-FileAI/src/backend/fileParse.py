import os
from PIL import Image
from pdf2image import convert_from_path
import pytesseract
import PyPDF2
import sys
import json


def parse_file(file_path):
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext in ['.txt', '.md', '.csv', '.json', '.log']:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"type": "text", "content": content}

    elif ext == '.pdf':
        # Extract text from PDF
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = ''
                for page in reader.pages:
                    text += page.extract_text() or ''
            # Optionally convert pages to images for visual models
            pages_images = convert_from_path(file_path)
            images_info = [{"page": i+1, "size": page.size} for i, page in enumerate(pages_images)]
            return {
                "type": "pdf",
                "content": text,
                "metadata": {
                    "pages": len(reader.pages),
                    "images_info": images_info,
                }
            }
        except Exception as e:
            return {"type": "pdf", "error": str(e)}

    elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp']:
        # Extract image metadata and text via OCR (optional)
        try:
            with Image.open(file_path) as img:
                ocr_text = pytesseract.image_to_string(img)
                return {
                    "type": "image",
                    "metadata": {
                        "format": img.format,
                        "size": img.size,
                        "mode": img.mode,
                    },
                    "content": ocr_text.strip() if ocr_text else None
                }
        except Exception as e:
            return {"type": "image", "error": str(e)}

    else:
        return {"type": "unknown", "notice": "File type not supported in this parser."}
if __name__ == '__main__':
    file_path = sys.argv[1]
    result = parse_file(file_path)
    print(json.dumps(result))