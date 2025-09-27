import os
from typing import List
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import re


from striprtf.striprtf import rtf_to_text
import subprocess


def parse_rtf_unrtf(file_path):
    result = subprocess.run(['unrtf', '--text', file_path], capture_output=True, text=True)
    if result.returncode == 0:
        return result.stdout.strip()
    else:
        print(f"UnRTF failed: {result.stderr}")
        return ""


def clean_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    return '\n'.join([line for line in lines if line])




def parse_txt(filepath: str) -> str:
    """
    Reads a text file, handling UTF-8 and UTF-16 encodings safely.
    Extracts only semantic sentences and skips metadata-like lines.
    """
    encodings_to_try = ["utf-8", "utf-16", "utf-16-le", "utf-16-be"]

    raw_text = None
    for enc in encodings_to_try:
        try:
            with open(filepath, "r", encoding=enc) as f:
                raw_text = f.read()
            break  # success, stop trying
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"Error opening {filepath} with {enc}: {e}")
            return ""

    if raw_text is None:
        print(f"Skipping non-text or unsupported encoding: {filepath}")
        return ""

    # Extract semantic-looking sentences (basic heuristic)
    semantic_lines = re.findall(r"[A-Z0-9][^.!?\n]*[.!?]", raw_text, flags=re.M)
    return " ".join(semantic_lines)



def parse_pdf(filepath: str) -> str:
    import PyPDF2
    text = ""
    with open(filepath, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def parse_docx(filepath: str) -> str:
    import docx
    doc = docx.Document(filepath)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text)


def parse_file(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.txt':
        raw_text = parse_txt(filepath)
    elif ext == '.pdf':
        raw_text = parse_pdf(filepath)
    elif ext == '.docx':
        raw_text = parse_docx(filepath)
    elif ext == '.rtf':
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                raw_rtf = f.read()
            raw_text = parse_rtf_unrtf(filepath)
        except Exception as e:
            print(f"Error parsing RTF file {filepath}: {e}")
            raw_text = ""
    else:
        raw_text = "" 
    
    return clean_text(raw_text)


def get_all_files_and_parse(directory: str, extensions=('.txt', '.pdf', '.docx', '.rtf')) -> List[str]:
    all_texts = []
    file_paths = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(extensions):
                path = os.path.join(root, file)
                try:
                    text = parse_file(path)
                    if text:
                        all_texts.append(text)
                        file_paths.append(path)
                except Exception as e:
                    print(f"Error parsing {path}: {e}")
    return all_texts, file_paths

def embed_and_index(texts: List[str]):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(texts, convert_to_tensor=False)
    embeddings_np = np.array(embeddings).astype('float32')
    dimension = embeddings_np.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings_np)
    return index, model


def semantic_search(index, model, metadata, query: str, k: int = 5):
    k = min(k, len(metadata)) 
    query_embedding = model.encode([query], convert_to_tensor=False)
    query_embedding_np = np.array(query_embedding).astype('float32')
    distances, indices = index.search(query_embedding_np, k)
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        file_path = metadata[idx]
        results.append({'file_path': file_path, 'distance': dist})
    return results



if __name__ == "__main__":
    directory_path = '/Users/vedantbhatt/source'
    print("Parsing files...")
    parsed_texts, file_paths = get_all_files_and_parse(directory_path)
    print(f"Parsed text from {len(parsed_texts)} files.")

    print("Embedding texts and building index...")
    index, model = embed_and_index(parsed_texts)


    query_text = "2110 Homework 2"
    print(f"Searching for top matches to query: {query_text}")
    top_results = semantic_search(index, model, file_paths, query_text, k=3)
    
    for res in top_results:
        print(f"File: {res['file_path']}, Distance: {res['distance']}")

