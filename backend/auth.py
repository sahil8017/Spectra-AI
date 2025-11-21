import os
from functools import wraps
from flask import request, jsonify, g
from dotenv import load_dotenv
import requests

load_dotenv()

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

def verify_clerk_token(token):
    """Verify Clerk JWT token"""
    try:
        # Verify with Clerk API
        response = requests.get(
            f"https://api.clerk.dev/v1/sessions/verify",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code == 200:
            session = response.json()
            return session.get("user_id")
        return None
    except Exception as e:
        print(f"Clerk verification error: {e}")
        return None

def require_auth(f):
    """Decorator to require authentication for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check for development mode - allow guest access
        if os.getenv("DEV_MODE", "false").lower() == "true":
            g.user_id = "guest"
            return f(*args, **kwargs)
        
        # Get token from header
        auth_header = request.headers.get("Authorization")
        
        if not auth_header:
            return jsonify({"error": "No authorization token provided"}), 401
        
        # Extract token (format: "Bearer <token>")
        try:
            token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        except IndexError:
            return jsonify({"error": "Invalid authorization format"}), 401
        
        # Verify Clerk token
        user_id = verify_clerk_token(token)
        
        if not user_id:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Store user_id in g object for use in route
        g.user_id = user_id
        
        return f(*args, **kwargs)
    
    return decorated_function
