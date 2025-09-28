import os
import time
from typing import List, Tuple
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from striprtf.striprtf import rtf_to_text
import subprocess
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel
from transformers import BlipProcessor, BlipForConditionalGeneration
import re
import concurrent.futures
import json
import sys


# Config constants
YOLO_SCORE_THRESH = 0.3
MAX_IMAGE_REGIONS = 20
BATCH_SIZE = 8
CACHE_DIR = ".cache_fileai"


# Ensure cache directory exists
os.makedirs(CACHE_DIR, exist_ok=True)


# Setup device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# Load models
def load_models():
    print("[INFO] Loading YOLOv5 model...", file=sys.stderr)
    yolo = None
    try:
        yolo = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True).to(device)
        yolo.eval()
        print("[INFO] YOLOv5 loaded.", file=sys.stderr)
    except Exception as e:
        print(f"[WARNING] YOLOv5 loading failed: {e}", file=sys.stderr)
    print("[INFO] Loading CLIP models...", file=sys.stderr)
    clip_proc = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    clip_mod = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
    clip_mod.eval()
    print("[INFO] Loading BLIP models...", file=sys.stderr)
    blip_proc = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    blip_mod = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)
    blip_mod.eval()
    print("[INFO] All models loaded.", file=sys.stderr)
    return yolo, clip_proc, clip_mod, blip_proc, blip_mod



def parse_rtf_unrtf(file_path):
    result = subprocess.run(['unrtf', '--text', file_path], capture_output=True, text=True)
    if result.returncode == 0:
        return result.stdout.strip()
    else:
        print(f"[WARNING] UnRTF failed on {file_path}: {result.stderr}", file=sys.stderr)
        return ""


def clean_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    return '\n'.join([line for line in lines if line])


def parse_txt(filepath: str) -> str:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        print(f"[WARNING] Skipping non-UTF8 or binary file: {filepath}", file=sys.stderr)
        return ""


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
    raw_text = ""
    try:
        if ext == '.txt':
            raw_text = parse_txt(filepath)
        elif ext == '.pdf':
            raw_text = parse_pdf(filepath)
        elif ext == '.docx':
            raw_text = parse_docx(filepath)
        elif ext == '.rtf':
            raw_text = parse_rtf_unrtf(filepath)
        else:
            print(f"[INFO] File extension {ext} not supported for parsing: {filepath}", file=sys.stderr)
    except Exception as e:
        print(f"[ERROR] Error parsing file {filepath}: {e}", file=sys.stderr)
    return clean_text(raw_text)


def get_all_files_and_parse_optimized(directory: str,
                                      text_exts=('.txt', '.pdf', '.docx', '.rtf'),
                                      image_exts=('.jpg', '.jpeg', '.png', '.bmp', '.gif')) -> Tuple[List[str], List[str], List[str]]:
    text_texts = []
    text_paths = []
    image_paths = []


    def parse_single_file(path):
        try:
            if path.lower().endswith(text_exts):
                return 'text', parse_file(path), path
            elif path.lower().endswith(image_exts):
                return 'image', None, path
        except Exception as e:
            print(f"[WARNING] Error parsing {path}: {e}", file=sys.stderr)
        return None, None, None


    print(f"[INFO] Walking directory {directory} and parsing files...", file=sys.stderr)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(parse_single_file, os.path.join(root, file))
                   for root, _, files in os.walk(directory) for file in files]


        for future in concurrent.futures.as_completed(futures):
            typ, content, path = future.result()
            if typ == 'text' and content:
                text_texts.append(content)
                text_paths.append(path)
            elif typ == 'image' and path:
                image_paths.append(path)


    return text_texts, text_paths, image_paths



# Embedding + Indexing and persistent cache save/load


def save_embeddings_captions(embeddings_np, captions, image_to_region, image_paths, save_dir):
    os.makedirs(save_dir, exist_ok=True)
    np.save(os.path.join(save_dir, 'image_embeddings.npy'), embeddings_np)
    dim = embeddings_np.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings_np)
    faiss.write_index(index, os.path.join(save_dir, 'faiss_index.bin'))
    meta = {
        "captions": captions,
        "image_to_region": image_to_region,
        "image_paths": image_paths
    }
    with open(os.path.join(save_dir, 'index_metadata.json'), 'w') as f:
        json.dump(meta, f)


def load_embeddings_captions(save_dir):
    try:
        embeddings_np = np.load(os.path.join(save_dir, 'image_embeddings.npy'))
        index = faiss.read_index(os.path.join(save_dir, 'faiss_index.bin'))
        with open(os.path.join(save_dir, 'index_metadata.json'), 'r') as f:
            meta = json.load(f)
        captions = meta['captions']
        image_to_region = [tuple(pair) for pair in meta['image_to_region']]
        image_paths = meta['image_paths']
        return embeddings_np, index, captions, image_to_region, image_paths
    except Exception as e:
        print(f"[WARN] Failed to load cached embeddings and metadata: {e}", file=sys.stderr)
        return None, None, None, None, None



def embed_and_index_texts(texts: List[str]):
    print("[INFO] Embedding texts with SentenceTransformer...", file=sys.stderr)
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(texts, convert_to_tensor=False)
    embeddings_np = np.array(embeddings).astype('float32')
    dim = embeddings_np.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings_np)
    print("[INFO] Text embeddings indexed.", file=sys.stderr)
    return index, model, embeddings_np.shape[0]


def embed_text_clip(text: str, clip_processor, clip_model) -> np.ndarray:
    inputs = clip_processor(text=[text], return_tensors="pt", padding=True).to(device)
    with torch.no_grad():
        features = clip_model.get_text_features(**inputs)
        features /= features.norm(p=2, dim=-1, keepdim=True)
    return features[0].cpu().numpy()


def optimize_embedding(images_batch, clip_processor, clip_model):
    inputs = clip_processor(images=images_batch, return_tensors="pt", padding=True).to(device)
    with torch.no_grad():
        feats = clip_model.get_image_features(**inputs)
        feats /= feats.norm(p=2, dim=-1, keepdim=True)
    return feats.cpu().numpy()


def optimize_captioning(images_batch, blip_processor, blip_model):
    inputs = blip_processor(images=images_batch, return_tensors="pt", padding=True).to(device)
    with torch.no_grad():
        outputs = blip_model.generate(**inputs, max_length=30)
    captions = [blip_processor.decode(o, skip_special_tokens=True) for o in outputs]
    filtered = []
    for cap in captions:
        if re.search(r'(\b\w+\b)(\s+\1){3,}', cap):
            filtered.append("")
        else:
            filtered.append(cap)
    return filtered


def detect_and_embed_objects_optimized(image_path: str, yolo_model, clip_processor, clip_model, blip_processor, blip_model):
    img = Image.open(image_path).convert('RGB')
    if yolo_model is None:
        return [img], [np.zeros((512,), dtype=np.float32)], [""]
    results = yolo_model(img)
    crops = []
    for *box, conf, cls in results.xyxy[0]:
        if conf < YOLO_SCORE_THRESH:
            continue
        x1, y1, x2, y2 = map(int, box)
        crop = img.crop((x1, y1, x2, y2))
        crops.append(crop)
        if len(crops) >= MAX_IMAGE_REGIONS:
            break
    if not crops:
        crops.append(img)
    embeddings = []
    captions = []
    for i in range(0, len(crops), BATCH_SIZE):
        batch = crops[i:i + BATCH_SIZE]
        embeddings.append(optimize_embedding(batch, clip_processor, clip_model))
        captions.extend(optimize_captioning(batch, blip_processor, blip_model))
    embeddings_np = np.vstack(embeddings)
    return crops, embeddings_np, captions


def embed_images_with_object_detection(image_paths: List[str], yolo_model, clip_processor, clip_model, blip_processor, blip_model) -> Tuple[np.ndarray, List[Tuple[int, int]], List[str]]:
    all_embeddings = []
    image_to_region = []
    all_captions = []
    for img_idx, img_path in enumerate(image_paths):
        try:
            crops, emb, caps = detect_and_embed_objects_optimized(img_path, yolo_model, clip_processor, clip_model, blip_processor, blip_model)
        except Exception as e:
            print(f"[WARNING] Detection/embedding error for {img_path}: {e}", file=sys.stderr)
            continue
        all_embeddings.extend(emb)
        image_to_region.extend([(img_idx, i) for i in range(emb.shape[0])])
        all_captions.extend(caps)
    if not all_embeddings:
        return np.array([]), [], []
    embeddings_np = np.array(all_embeddings).astype('float32')
    return embeddings_np, image_to_region, all_captions


def build_image_index(embeddings_np: np.ndarray):
    dim = embeddings_np.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings_np)
    return index


from sentence_transformers import SentenceTransformer as ST


_word_embedding_model = ST('all-MiniLM-L6-v2')


def _get_word_embeddings(words: List[str]):
    return _word_embedding_model.encode(words, convert_to_tensor=False)


def semantic_soft_keyword_boost(query: str, caption: str, threshold: float = 0.7, boost_factor: float = 0.15):
    query_words = list(set(query.lower().split()))
    caption_words = list(set(caption.lower().split()))
    if not query_words or not caption_words:
        return 0.0
    query_embs = _get_word_embeddings(query_words)
    caption_embs = _get_word_embeddings(caption_words)
    boost_score = 0.0
    for q_emb in query_embs:
        sims = np.array([np.dot(q_emb, c_emb) / (np.linalg.norm(q_emb)*np.linalg.norm(c_emb)) for c_emb in caption_embs])
        max_sim = np.max(sims) if sims.size > 0 else 0.0
        if max_sim >= threshold:
            boost_score += boost_factor * max_sim
    return boost_score


def semantic_search_images(index, image_paths, image_to_region, captions, query: str, clip_processor, clip_model, k: int = 5):
    query_emb = embed_text_clip(query, clip_processor, clip_model)
    distances, indices = index.search(np.expand_dims(query_emb, axis=0), k * 5)
    best_scores_per_image = {}
    for dist, idx in zip(distances[0], indices[0]):
        img_idx, region_idx = image_to_region[idx]
        file_path = image_paths[img_idx]
        score = 1 / (1 + dist)
        caption = captions[idx] if idx < len(captions) else ""
        keyword_boost = semantic_soft_keyword_boost(query, caption)
        final_score = score + keyword_boost
        if file_path not in best_scores_per_image or final_score > best_scores_per_image[file_path]['final_score']:
            best_scores_per_image[file_path] = {
                "file_path": file_path,
                "semantic_score": score,
                "distance": dist,
                "region_index": region_idx,
                "caption": caption,
                "final_score": final_score,
            }
    results = sorted(best_scores_per_image.values(), key=lambda x: x["final_score"], reverse=True)[:k]
    return results


def keyword_score(text: str, query: str) -> float:
    query_words = set(query.lower().split())
    text_words = set(text.lower().split())
    common = query_words.intersection(text_words)
    return len(common) / len(query_words) if query_words else 0


def hybrid_semantic_search(index, model, texts, file_paths, query: str, k: int = 5, alpha: float = 0.5):
    k = min(k, len(texts))
    query_embedding = model.encode([query], convert_to_tensor=False)
    query_embedding_np = np.array(query_embedding).astype("float32")
    distances, indices = index.search(query_embedding_np, k)
    results = []
    max_distance = max(distances[0]) if distances[0].size > 0 else 1e-6
    for dist, idx in zip(distances[0], indices[0]):
        sem_score = 1 - dist / (max_distance + 1e-12)
        kw_score = keyword_score(texts[idx], query)
        combined_score = alpha * sem_score + (1 - alpha) * kw_score
        results.append(
            {
                "file_path": file_paths[idx],
                "semantic_score": sem_score,
                "keyword_score": kw_score,
                "combined_score": combined_score,
            }
        )
    results = sorted(results, key=lambda x: x["combined_score"], reverse=True)
    return results[:k]


def run_method(method, path, target=None, type=None):
    """
    Command line entry point to run embedding or search.

    args format:
    args[0]: method, either 'embed' or 'search'
    args[1]: for 'embed': JSON string array of file paths to embed
             for 'search': path (file or directory) to search in
    args[2]: for 'search': user query string to search for
    args[3]: type string, either "text" or "image" indicating scope to include files of this category only
    """
    method = method


    # Define text and image extensions used throughout
    text_exts = ('.txt', '.pdf', '.docx', '.rtf')
    image_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.gif')


    if method == 'embed':
        file_paths = json.loads(path)
        requested_type = type.lower() if type else 'all'

        if requested_type == 'text':
            filtered_paths = [p for p in file_paths if p.lower().endswith(text_exts)]
        elif requested_type == 'image':
            filtered_paths = [p for p in file_paths if p.lower().endswith(image_exts)]
        else:
            filtered_paths = file_paths

        text_index, image_embeddings_np, all_captions, image_to_region, image_paths = embed_files(filtered_paths)
        indexed_count = 0
        if requested_type == 'text':
            indexed_count = len([p for p in filtered_paths if p.lower().endswith(text_exts)])
        elif requested_type == 'image':
            indexed_count = len([p for p in filtered_paths if p.lower().endswith(image_exts)])
        else:
            indexed_count = len(filtered_paths)

        return {"status": "success", "indexed_count": indexed_count}

    elif method == 'search':
        search_path = path
        query = target
        requested_type = type.lower() if type else 'all'

        if os.path.isdir(search_path):
            all_file_paths = []
            for root, _, files in os.walk(search_path):
                for file in files:
                    all_file_paths.append(os.path.join(root, file))
        elif os.path.isfile(search_path):
            all_file_paths = [search_path]
        else:
            return {"error": f"Search path '{search_path}' is not a valid file or directory"}

        if requested_type == 'text':
            filtered_paths = [p for p in all_file_paths if p.lower().endswith(text_exts)]
        elif requested_type == 'image':
            filtered_paths = [p for p in all_file_paths if p.lower().endswith(image_exts)]
        else:
            filtered_paths = all_file_paths

        all_texts = []
        text_file_paths = []
        if requested_type in ['text', 'all']:
            for path in filtered_paths:
                if path.lower().endswith(text_exts):
                    text_content = parse_file(path)
                    if text_content:
                        all_texts.append(text_content)
                        text_file_paths.append(path)

        if len(all_texts) == 0 and requested_type in ['text', 'all']:
            return {"error": "No text files found for searching"}

        if requested_type in ['text', 'all']:
            text_index, text_model, _ = embed_and_index_texts(all_texts)

        image_results = []
        if requested_type in ['image', 'all']:
            cache_path = os.path.join(CACHE_DIR, 'image_index_cache')
            embeddings_np_cached, image_index_cached, captions_cached, image_to_region_cached, image_paths_cached = load_embeddings_captions(cache_path)

            if embeddings_np_cached is not None:
                cache_set = set(image_paths_cached or [])
                filtered_image_paths = [p for p in filtered_paths if p in cache_set]

                embeddings_np = embeddings_np_cached
                image_index = image_index_cached
                captions = captions_cached
                image_to_region = image_to_region_cached
                image_paths_all = image_paths_cached

                yolo, clip_processor, clip_model, blip_processor, blip_model = load_models()

                image_results = semantic_search_images(
                    image_index,
                    image_paths_all,
                    image_to_region,
                    captions,
                    query,
                    clip_processor,
                    clip_model,
                    k=10
                )
            else:
                image_results = []

        text_results = []
        if requested_type in ['text', 'all'] and len(all_texts) > 0:
            text_results = hybrid_semantic_search(
                text_index,
                text_model,
                all_texts,
                text_file_paths,
                query,
                k=10,
                alpha=0.7
            )

        return {
            "text_results": text_results,
            "image_results": image_results
        }

    else:
        return {"error": f"Unknown method {method}"}
    
def embed_files(file_paths: List[str]) -> Tuple[np.ndarray, np.ndarray, List[str], List[Tuple[int, int]], List[str]]:
    text_exts = ('.txt', '.pdf', '.docx', '.rtf')
    image_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.gif')

    text_paths = [p for p in file_paths if p.lower().endswith(text_exts)]
    image_paths = [p for p in file_paths if p.lower().endswith(image_exts)]

    all_texts = []
    for path in text_paths:
        text = parse_file(path)
        if text:
            all_texts.append(text)

    text_index, text_model, text_count = embed_and_index_texts(all_texts)
    yolo, clip_processor, clip_model, blip_processor, blip_model = load_models()
    image_embeddings_np, image_to_region, all_captions = embed_images_with_object_detection(
        image_paths, yolo, clip_processor, clip_model, blip_processor, blip_model)

    cache_dir = os.path.join(CACHE_DIR, 'combined_embedding_cache')
    save_embeddings_captions(image_embeddings_np, all_captions, image_to_region, image_paths, cache_dir)

    return text_index, image_embeddings_np, all_captions, image_to_region, image_paths



if __name__ == "__main__":
    try:
        file_path = sys.argv[1]
        query = sys.argv[2]
        result = run_method("search", file_path, query)
        print(json.dumps(result))
    except Exception as e:
        print(f"[ERROR] {str(e)}", file=sys.stderr)
        sys.exit(1)
