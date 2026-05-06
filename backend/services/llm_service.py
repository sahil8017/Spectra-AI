import google.generativeai as genai
from huggingface_hub import InferenceClient

from ..config import settings

_gemini_client = None
_hf_client = None

def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        _gemini_client = genai.GenerativeModel("gemini-2.5-flash")
    return _gemini_client

def get_hf_client():
    global _hf_client
    if _hf_client is None:
        _hf_client = InferenceClient(api_key=settings.HUGGINGFACE_API_KEY)
    return _hf_client

def _format_prompt(prompt: str, system_prompt: str = None, history: list = None, provider: str = "gemini"):
    if provider == "gemini":
        full_prompt = ""
        if system_prompt:
            full_prompt += f"{system_prompt}\n\n"
        if history:
            for msg in history:
                role = "User" if msg.get("role") == "user" else "Assistant"
                content = msg.get("content")
                if content is None and "parts" in msg and msg["parts"]:
                    content = msg["parts"][0]
                if content:
                    full_prompt += f"{role}: {content}\n"
        full_prompt += f"User: {prompt}"
        return full_prompt
    
    elif provider == "huggingface":
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if history:
            for msg in history:
                role = "user" if msg.get("role") == "user" else "assistant"
                content = msg.get("content")
                if content is None and "parts" in msg and msg["parts"]:
                    content = msg["parts"][0]
                if content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": prompt})
        return messages

def generate_response(prompt: str, system_prompt: str = None, stream: bool = False, history: list = None, provider: str = "gemini", fallback: bool = True) -> str:
    try:
        if provider == "gemini":
            client = get_gemini_client()
            full_prompt = _format_prompt(prompt, system_prompt, history, provider="gemini")
            
            if stream:
                response_stream = client.generate_content(full_prompt, stream=True)
                for chunk in response_stream:
                    if getattr(chunk, "text", None):
                        yield chunk.text
            else:
                response = client.generate_content(full_prompt)
                return response.text
                
        elif provider == "huggingface":
            client = get_hf_client()
            messages = _format_prompt(prompt, system_prompt, history, provider="huggingface")
            model = "mistralai/Mixtral-8x7B-Instruct-v0.1"
            
            if stream:
                # Need to yield from generator
                for message in client.chat_completion(model=model, messages=messages, stream=True, max_tokens=1000):
                    content = message.choices[0].delta.content
                    if content:
                        yield content
            else:
                response = client.chat_completion(model=model, messages=messages, max_tokens=1000)
                return response.choices[0].message.content

    except Exception as e:
        error_msg = f"Error with {provider}: {str(e)}"
        print(error_msg)
        
        if fallback and provider == "gemini" and settings.HUGGINGFACE_API_KEY:
            print("Gemini failed, falling back to Hugging Face...")
            yield from generate_response(prompt, system_prompt, stream, history, provider="huggingface", fallback=False)
            return

        final_msg = "⚠️ Rate limit reached. Try again in a moment." if "429" in str(e) else f"❌ {error_msg}"
        if stream:
            yield final_msg
        else:
            return final_msg

def generate_with_context(user_query: str, context_chunks: list, history: list = None) -> str:
    system_prompt = (
        "You are a helpful AI assistant. Answer ONLY using the provided context. "
        "If not found, say: 'The provided document does not contain relevant information.'"
    )

    context_text = "\n\n---\n\n".join(context_chunks)

    prompt = f"""
Context:
{context_text}

Question:
{user_query}
"""

    # We use huggingface provider for RAG so we don't rely on Gemini
    provider = "huggingface" if settings.HUGGINGFACE_API_KEY else "gemini"
    return generate_response(prompt, system_prompt=system_prompt, history=history, stream=True, provider=provider)