from typing import List

_model = None

def init_client():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Downloads weights on first run, then uses cached local model
            # all-MiniLM-L6-v2 is fast, very lightweight, and standard for small-scale RAG
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except ImportError:
            print("Warning: sentence-transformers not installed. Returning dummy embeddings.")
            _model = None

def get_embeddings(texts: List[str]) -> List[List[float]]:
    init_client()
    if _model is None:
        return [[0.0] * 384 for _ in texts]
    
    try:
        # encode returns numpy array, convert to list of lists
        embeddings = _model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return [[0.0] * 384 for _ in texts]

def get_embedding(text: str) -> List[float]:
    init_client()
    if _model is None:
        return [0.0] * 384
        
    try:
        embedding = _model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return [0.0] * 384

