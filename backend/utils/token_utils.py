import tiktoken
from typing import List, Dict

def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """
    Returns the number of tokens in a text string.
    Note: Gemini tokens are slightly different but tiktoken is a good proxy for general pruning.
    """
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))

def prune_messages(messages: List[Dict], max_tokens: int = 4000) -> List[Dict]:
    """
    Prunes messages from the start to fit within max_tokens.
    Always preserves the first message if it's a system prompt.
    """
    if not messages:
        return []
        
    system_msg = None
    if messages[0].get("role") == "system":
        system_msg = messages[0]
        messages = messages[1:]
        
    current_tokens = 0
    if system_msg:
        current_tokens += count_tokens(system_msg.get("content", ""))
        
    pruned = []
    # Work backwards from the most recent messages
    for msg in reversed(messages):
        tokens = count_tokens(msg.get("content", ""))
        if current_tokens + tokens > max_tokens:
            break
        pruned.insert(0, msg)
        current_tokens += tokens
        
    if system_msg:
        pruned.insert(0, system_msg)
        
    return pruned

def summarize_history(messages: List[Dict]) -> str:
    """
    Placeholder for future LLM-based summarization of old history.
    """
    return "Summary of previous conversation..."
