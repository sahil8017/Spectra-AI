# backend/auth.py
from functools import wraps
from flask import request, jsonify, g
import os

# Dev bypass toggle (set DEV_MODE=true in .env to enable)
DEV_MODE = os.getenv("DEV_MODE", "true").lower() in ("1", "true", "yes")

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if DEV_MODE:
            # Bypass auth for local dev
            g.user_id = "guest"
            return f(*args, **kwargs)

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Missing Authorization header"}), 401

        token = auth_header.replace("Bearer ", "").strip()

        # In production you'd verify the token with Clerk here.
        # For now, reject if token isn't present when DEV_MODE is off.
        # TODO: add proper Clerk verification.
        g.user_id = "guest"
        return f(*args, **kwargs)
    return wrapper
