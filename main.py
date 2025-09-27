import os
from typing import List
from sentence_transformers import SentenceTransformer

# File format parsers
def parse_txt(filepath: str) -> str:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        print(f"Skipping non-UTF8 or binary file: {filepath}")
        return ""


def parse_pdf(filepath: str) -> str:
    import PyPDF2
    text = ""
    with open(filepath, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def parse_docx(filepath: str) -> str:
    import docx
    doc = docx.Document(filepath)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text)

# Main parser dispatcher based on file extension
def parse_file(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.txt':
        return parse_txt(filepath)
    elif ext == '.pdf':
        return parse_pdf(filepath)
    elif ext == '.docx':
        return parse_docx(filepath)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

# Chunk text into smaller pieces (split by double newlines)
def chunk_text(text: str) -> List[str]:
    chunks = [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]
    return chunks

# Generate semantic embeddings from text chunks
def get_embeddings(chunks: List[str], model_name: str = 'all-MiniLM-L6-v2'):
    model = SentenceTransformer(model_name)
    embeddings = model.encode(chunks)
    return embeddings

# Example usage
def process_files(filepaths: List[str]):
    all_chunks = []
    for path in filepaths:
        try:
            text = parse_file(path)
            chunks = chunk_text(text)
            all_chunks.extend(chunks)
        except Exception as e:
            print(f"Error processing {path}: {e}")
    embeddings = get_embeddings(all_chunks)
    return all_chunks, embeddings

def get_all_files(directory: str, extensions=('.txt', '.pdf', '.docx')):
    file_paths = []
    for root, dirs, files in os.walk(directory):
        if 'Chrome/Default/WebStorage' in root:
            continue  # skip Chrome cache folders
        for file in files:
            if file.lower().endswith(extensions):
                file_paths.append(os.path.join(root, file))
    return file_paths



if __name__ == "__main__":
    dir_to_process = '/Users/vedantbhatt'  # or your target folder
    files_to_process = get_all_files(dir_to_process)
    chunks, embeddings = process_files(files_to_process)
    print(f"Processed {len(chunks)} text chunks from {len(files_to_process)} files.")
