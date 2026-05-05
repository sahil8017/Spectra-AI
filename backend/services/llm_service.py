from google import genai
from config import settings
import time

_client = None

def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return _client


def generate_response(prompt: str, system_prompt: str = None, stream: bool = False, history: list = None) -> str:
    client = get_client()

    try:
        full_prompt = ""

        if system_prompt:
            full_prompt += f"{system_prompt}\n\n"

        if history:
            for msg in history:
                role = "User" if msg["role"] == "user" else "Assistant"
                full_prompt += f"{role}: {msg['content']}\n"

        full_prompt += f"User: {prompt}"

        if stream:
            response_stream = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=full_prompt
            )
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        else:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt
            )
            return response.text

    except Exception as e:
        error_msg = "⚠️ Rate limit reached. Try again in a moment." if "429" in str(e) else f"❌ Error: {str(e)}"
        if stream:
            yield error_msg
        else:
            return error_msg


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

    return generate_response(prompt, system_prompt=system_prompt, history=history, stream=True)