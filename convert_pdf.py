from pdf2docx import Converter
import sys
import os

def convert_pdf_to_docx(pdf_file, docx_file):
    cv = Converter(pdf_file)
    cv.convert(docx_file, start=0, end=None)
    cv.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_pdf.py <input_pdf> <output_docx>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    docx_path = sys.argv[2]
    
    try:
        convert_pdf_to_docx(pdf_path, docx_path)
        print("Conversion successful")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
