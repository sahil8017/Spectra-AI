import json
import logging
from redis import Redis
from ..config import settings

logger = logging.getLogger("spectra-cache")

class CacheService:
    def __init__(self):
        try:
            self.redis = Redis.from_url(settings.REDIS_URL)
            self.redis.ping()
            self.enabled = True
            logger.info("Redis Cache enabled.")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Cache disabled.")
            self.enabled = False

    def get(self, key: str):
        if not self.enabled: return None
        data = self.redis.get(key)
        if data:
            return json.loads(data)
        return None

    def set(self, key: str, value: any, expire: int = 3600):
        if not self.enabled: return
        self.redis.set(key, json.dumps(value), ex=expire)

    def delete(self, key: str):
        if not self.enabled: return
        self.redis.delete(key)

    def get_embedding_key(self, text: str) -> str:
        # Use hash of text for key
        import hashlib
        return f"emb:{hashlib.md5(text.encode()).hexdigest()}"

    def get_semantic(self, query: str, threshold: float = 0.95):
        """
        Retrieves a semantically similar response from the cache.
        """
        if not self.enabled: return None
        try:
            from .rag_service import get_collection
            from .embedding_service import get_embedding
            
            # We use a separate collection for semantic cache
            import chromadb
            client = chromadb.PersistentClient(path=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db"))
            cache_col = client.get_or_create_collection("semantic_cache")
            
            embedding = get_embedding(query)
            results = cache_col.query(
                query_embeddings=[embedding],
                n_results=1
            )
            
            if results['distances'] and results['distances'][0] and (1 - results['distances'][0][0]) >= threshold:
                return results['metadatas'][0][0]['response']
        except Exception as e:
            logger.error(f"Semantic cache lookup failed: {e}")
        return None

    def set_semantic(self, query: str, response: str):
        if not self.enabled: return
        try:
            from .embedding_service import get_embedding
            import chromadb
            client = chromadb.PersistentClient(path=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db"))
            cache_col = client.get_or_create_collection("semantic_cache")
            
            embedding = get_embedding(query)
            import uuid
            cache_col.add(
                ids=[str(uuid.uuid4())],
                embeddings=[embedding],
                metadatas=[{"response": response, "query": query}]
            )
        except Exception as e:
            logger.error(f"Semantic cache storage failed: {e}")

cache_service = CacheService()
