import chromadb
import os
from typing import List
from .document_service import chunk_text
from .embedding_service import get_embeddings, get_embedding

_client = None
_collection = None

# Use absolute path to avoid Windows Errno 22 with relative paths
_CHROMA_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")

def get_collection():
    global _client, _collection
    if _collection is None:
        os.makedirs(_CHROMA_DB_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(path=_CHROMA_DB_PATH)
        _collection = _client.get_or_create_collection(
            name="documents_v2",
            metadata={"hnsw:space": "cosine"}
        )
    return _collection

def store_document(doc_id: str, text: str, metadata: dict) -> int:
    collection = get_collection()
    chunks = chunk_text(text)
    if not chunks:
        return 0

    embeddings = get_embeddings(chunks)

    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [{**metadata, "chunk_index": i, "doc_id": doc_id} for i in range(len(chunks))]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )
    return len(chunks)

def retrieve_context(query: str, top_k: int = 5) -> List[str]:
    collection = get_collection()
    query_embedding = get_embedding(query)

    # Make sure we don't request more results than what's in the collection
    count = collection.count()
    n_results = min(top_k, count) if count > 0 else 0
    if n_results == 0:
        return []

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )

    if not results['documents'] or not results['documents'][0]:
        return []
    return results['documents'][0]

def delete_document(doc_id: str):
    collection = get_collection()
    collection.delete(where={"doc_id": doc_id})
