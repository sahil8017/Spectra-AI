from google import genai
from config import settings
from typing import List

_client = None

def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return _client

def get_embeddings(texts: List[str]) -> List[List[float]]:
    client = get_client()
    try:
        result = client.models.embed_content(
            model='text-embedding-004',
            contents=texts
        )
        return [emb.values for emb in result.embeddings]
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        # Fallback to zero vectors if API fails (not ideal, but prevents crash)
        return [[0.0] * 768 for _ in texts]

def get_embedding(text: str) -> List[float]:
    return get_embeddings([text])[0]
