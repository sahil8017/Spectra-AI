"""
Advanced RAG Pipeline — Query Rewriting & Context Compression.

Query Rewriting: Uses LLM to improve the user's raw query before embedding/search.
Context Compression: Summarizes retrieved chunks to fit within token limits.
"""
import logging
from typing import List, Optional

logger = logging.getLogger("spectra-rag-advanced")

# ─────────────────────────────────────────────
# Query Rewriting
# ─────────────────────────────────────────────

QUERY_REWRITE_PROMPT = """You are a search query optimizer. 
Given the user's raw query, rewrite it into a clearer, more specific search query 
that will retrieve the most relevant information from a document database.

Rules:
- Keep it concise (1-2 sentences max)
- Expand abbreviations
- Remove conversational filler
- Focus on the core information need
- Do NOT answer the question, just rewrite the query

Raw query: {query}
Rewritten query:"""


def rewrite_query(query: str) -> str:
    """
    Uses the LLM to rewrite a user query for better vector search retrieval.
    Falls back to the original query if rewriting fails.
    """
    if len(query.strip()) < 15:
        # Short queries don't need rewriting
        return query

    try:
        from .llm_service import generate_response
        
        prompt = QUERY_REWRITE_PROMPT.format(query=query)
        # Non-streaming, single-pass call
        result = ""
        for chunk in generate_response(prompt, history=[], stream=True):
            result += chunk
            if len(result) > 300:  # Prevent runaway rewriting
                break
        
        rewritten = result.strip()
        if rewritten and len(rewritten) > 5:
            logger.info(f"Query rewritten: '{query[:50]}' → '{rewritten[:50]}'")
            return rewritten
    except Exception as e:
        logger.warning(f"Query rewriting failed: {e}. Using original.")
    
    return query


# ─────────────────────────────────────────────
# Context Compression
# ─────────────────────────────────────────────

COMPRESSION_PROMPT = """You are a context compression assistant.
Given the retrieved document chunks below and the user's query, 
extract and summarize ONLY the information that is directly relevant to answering the query.
Be concise but complete. Preserve key facts, numbers, and names exactly.

Query: {query}

Retrieved chunks:
{chunks}

Compressed relevant context:"""


def compress_context(query: str, chunks: List[str], max_tokens: int = 800) -> str:
    """
    Compresses retrieved RAG chunks to only the query-relevant content.
    Falls back to simple concatenation if compression fails.
    """
    if not chunks:
        return ""
    
    # Simple token estimate: ~4 chars per token
    raw_context = "\n---\n".join(chunks)
    estimated_tokens = len(raw_context) // 4
    
    if estimated_tokens <= max_tokens:
        # Already within limit, no compression needed
        return raw_context
    
    try:
        from .llm_service import generate_response
        
        prompt = COMPRESSION_PROMPT.format(
            query=query,
            chunks=raw_context[:6000]  # Safety cap on input
        )
        
        compressed = ""
        for chunk in generate_response(prompt, history=[], stream=True):
            compressed += chunk
            if len(compressed) > max_tokens * 4:
                break
        
        compressed = compressed.strip()
        if compressed:
            reduction = 100 - int((len(compressed) / len(raw_context)) * 100)
            logger.info(f"Context compressed by {reduction}% ({len(raw_context)} → {len(compressed)} chars)")
            return compressed
    except Exception as e:
        logger.warning(f"Context compression failed: {e}. Using truncated raw context.")
    
    # Fallback: truncate to token limit
    max_chars = max_tokens * 4
    return raw_context[:max_chars] + ("\n...[truncated]" if len(raw_context) > max_chars else "")


def advanced_retrieve(query: str, user_id: str, doc_id: Optional[str] = None, top_k: int = 20) -> str:
    """
    Full advanced retrieval pipeline:
    1. Rewrite query
    2. Hybrid vector + keyword search
    3. Rerank results
    4. Compress context
    Returns a single compressed context string ready for LLM injection.
    """
    from .rag_service import retrieve_context
    
    # Step 1: Rewrite query
    rewritten_query = rewrite_query(query)
    
    # Step 2: Retrieve with metadata filter
    filter_meta = {"user_id": user_id}
    if doc_id:
        filter_meta["doc_id"] = doc_id
    
    chunks = retrieve_context(rewritten_query, top_k=top_k, filter_metadata=filter_meta)
    
    if not chunks:
        return ""
    
    # Step 3: Compress context
    compressed = compress_context(query, chunks, max_tokens=1200)
    
    return compressed
