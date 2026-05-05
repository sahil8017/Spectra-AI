import io
import os
import tempfile
from typing import List

# Force a safe ASCII temp dir for pdfminer on Windows to avoid Errno 22
_SAFE_TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".tmp")
_SAFE_TMP = os.path.normpath(_SAFE_TMP)
os.makedirs(_SAFE_TMP, exist_ok=True)
# Override the global temp dir so pdfminer picks it up
os.environ["TMPDIR"] = _SAFE_TMP
os.environ["TEMP"] = _SAFE_TMP
os.environ["TMP"] = _SAFE_TMP
tempfile.tempdir = _SAFE_TMP

import pdfplumber  # Import AFTER setting tempdir so it inherits the override


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from PDF bytes using a safe temp file path for Windows."""
    # Write to a temp file with explicit dir to avoid Errno 22
    fd, tmp_path = tempfile.mkstemp(suffix=".pdf", dir=_SAFE_TMP)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(file_bytes)
        
        text = ""
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    chunks = []
    step = chunk_size - overlap
    if step <= 0:
        step = chunk_size

    for i in range(0, len(text), step):
        chunk = text[i:i + chunk_size].strip()
        if len(chunk) >= 50:
            chunks.append(chunk)

    return chunks
