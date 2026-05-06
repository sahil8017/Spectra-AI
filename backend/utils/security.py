import bleach

def sanitize_text(text: str) -> str:
    """
    Sanitizes user input to prevent XSS and basic prompt injection artifacts.
    """
    if not text:
        return ""
    # Strip HTML tags
    clean = bleach.clean(text, tags=[], strip=True)
    return clean.strip()

def validate_prompt(prompt: str) -> bool:
    """
    Basic check for prompt injection keywords or suspicious patterns.
    """
    suspicious_keywords = ["ignore previous instructions", "system prompt", "as an admin"]
    for keyword in suspicious_keywords:
        if keyword in prompt.lower():
            return False
    return True
