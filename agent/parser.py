import re

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