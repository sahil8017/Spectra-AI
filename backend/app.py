# backend/app.py
import os
import re
import shlex
import subprocess
from datetime import datetime

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv
from bson import ObjectId
from werkzeug.utils import secure_filename # For file uploads

# ---------------------------------------------------------------------
# Local imports (backend package)
# ---------------------------------------------------------------------
from backend.db import db
from backend.auth import require_auth
from backend.models.chat import create_chat, get_chat, add_to_chat
from backend.models.user_chats import add_user_chat, get_user_chats
from backend.models.history import save_history, get_all_history, get_history_by_video

# ---------------------------------------------------------------------
# Optional model (Google Gemini)
# ---------------------------------------------------------------------
try:
    import google.generativeai as genai
except Exception:
    genai = None

# ---------------------------------------------------------------------
# YouTube transcript lib
# ---------------------------------------------------------------------
try:
    # import module and class to avoid shadowing issues
    import youtube_transcript_api as yta
    from youtube_transcript_api import YouTubeTranscriptApi
except Exception:
    yta = None
    YouTubeTranscriptApi = None

# ---------------------------------------------------------------------
# Env & Config
# ---------------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash")
MAX_AI_CHARS = int(os.getenv("MAX_AI_CHARS", 1200))

app = Flask(__name__)
CORS(app) # This is already correctly configured

# ---------------------------------------------------------------------
# AI Model Setup
# ---------------------------------------------------------------------
model = None
if genai and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(MODEL_NAME)
    except Exception:
        model = None

chats_collection = db["chats"]

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def serialize_doc(doc):
    """Convert MongoDB doc to JSON‑serializable dict."""
    if not doc:
        return None
    out = dict(doc)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    for k in ("createdAt", "updatedAt"):
        if k in out and hasattr(out[k], "isoformat"):
            out[k] = out[k].isoformat()
    return out


def format_history_for_frontend(history):
    """Convert internal history format to simple {role,text,img} list."""
    formatted = []
    for item in history:
        role = item.get("role")
        parts = item.get("parts", [])
        text = "".join([p.get("text", "") for p in parts])
        entry = {"role": role, "text": text}
        if "img" in item and item["img"] is not None:
            entry["img"] = item["img"]
        formatted.append(entry)
    return formatted


def clean_ai_response(text: str) -> str:
    """Normalize and trim AI response."""
    if text is None:
        return ""
    s = text.strip()
    s = re.sub(r"\n{3,}", "\n\n", s)
    if len(s) > MAX_AI_CHARS:
        cut = s[:MAX_AI_CHARS]
        if " " in cut:
            cut = cut.rsplit(" ", 1)[0]
        s = cut + "..."
    return s


def extract_youtube_id(url: str) -> str:
    """Extract the YouTube Video ID from any type of link or raw ID."""
    if not url:
        return None
    url = url.strip()

    # Short link
    if "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0].split("&")[0]

    # Standard or embed/shorts links
    if "youtube.com" in url:
        m = re.search(r"[?&]v=([^&]+)", url)
        if m:
            return m.group(1)
        m2 = re.search(r"/(shorts|embed)/([^?&/]+)", url)
        if m2:
            return m2.group(2)

    # Direct video ID
    if re.fullmatch(r"[A-Za-z0-9_-]{6,}", url):
        return url

    return None

# ---------------------------------------------------------------------
# CHAT ROUTES
# ---------------------------------------------------------------------
@app.route("/api/chats", methods=["GET"])
@require_auth
def get_chats_route():
    user_id = getattr(g, "user_id", "guest")
    # Sort by update time, newest first
    chats = list(chats_collection.find({"userId": user_id}, {"history": 0}).sort("updatedAt", -1))
    chats = [serialize_doc(c) for c in chats]
    return jsonify({"chats": chats})


@app.route("/api/chat/<chat_id>", methods=["GET"])
@require_auth
def get_chat_route(chat_id):
    user_id = getattr(g, "user_id", "guest")
    try:
        chat = chats_collection.find_one({"_id": ObjectId(chat_id), "userId": user_id})
    except Exception:
        return jsonify({"error": "Invalid chat id"}), 400
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    chat = serialize_doc(chat)
    # This history is now used by the frontend
    chat["history"] = format_history_for_frontend(chat.get("history", []))
    return jsonify(chat)


@app.route("/api/create-chat", methods=["POST"])
@require_auth
def create_chat_route():
    user_id = getattr(g, "user_id", "guest")
    data = request.get_json() or {}
    title = data.get("title", "New Chat")
    initial_text = data.get("text") # Frontend now sends this

    # Pass the initial text to the create_chat function
    chat_id = create_chat(user_id, text=initial_text, title=title)
    
    # This part is optional but good for user-centric models
    try:
        add_user_chat(user_id, chat_id, title)
    except Exception:
        pass

    # Return the new chat ID
    return jsonify({"chatId": chat_id, "title": title})


@app.route("/api/send-message", methods=["POST"])
@require_auth
def send_message_route():
    user_id = getattr(g, "user_id", "guest")
    data = request.get_json() or {}
    chat_id = data.get("chatId") # Frontend sends "chatId"
    text = data.get("text")      # Frontend sends "text"

    if not chat_id or not text:
        return jsonify({"error": "Missing chatId or text"}), 400
    
    # Check if chat exists and belongs to user
    try:
        chat_exists = chats_collection.find_one({"_id": ObjectId(chat_id), "userId": user_id})
    except Exception:
        return jsonify({"error": "Invalid chat ID format"}), 400
    
    if not chat_exists:
        return jsonify({"error": "Chat not found or access denied"}), 404

    ai_response = "Sorry — I couldn't generate a response right now."

    if model:
        try:
            # TODO: Add chat history to the prompt for context
            #
            # Example:
            # chat_history = chat_exists.get("history", [])
            # full_prompt = "---START HISTORY---\n"
            # for msg in chat_history:
            #   full_prompt += f"{msg['role']}: {msg['parts'][0]['text']}\n"
            # full_prompt += "---END HISTORY---\n"
            # full_prompt += f"user: {text}"
            #
            # resp = model.generate_content(full_prompt)
            # 
            # For now, just send the last message
            
            resp = model.generate_content(text)

            if hasattr(resp, "text"):
                ai_response = resp.text
            elif isinstance(resp, dict):
                candidates = resp.get("candidates") or []
                if candidates:
                    content = candidates[0].get("content") or {}
                    ai_response = (content.get("parts", [{}])[0].get("text") or 
                                   candidates[0].get("text") or 
                                   ai_response)
            else:
                ai_response = str(resp)
        except Exception as e:
            print(f"Gemini Error: {e}")
            pass

    ai_response = clean_ai_response(ai_response)

    try:
        add_to_chat(chat_id, user_id, question=text, answer=ai_response)
    except Exception as e:
        return jsonify(
            {
                "user": text,
                "ai": ai_response,
                "warning": "Failed to save message",
                "detail": str(e),
            }
        ), 200 # Still return 200 so frontend can display AI response

    # Frontend expects { "ai": "..." }
    return jsonify({"user": text, "ai": ai_response})

# ---------------------------------------------------------------------
# HISTORY ROUTES (No changes needed)
# ---------------------------------------------------------------------
@app.route("/api/history", methods=["GET"])
@require_auth
def history_all_route():
    user_id = getattr(g, "user_id", "guest")
    history = get_all_history(user_id)
    output = []
    for h in history:
        h["_id"] = str(h["_id"])
        if hasattr(h.get("createdAt"), "isoformat"):
            h["createdAt"] = h["createdAt"].isoformat()
        output.append(h)
    return jsonify({"history": output})


@app.route("/api/history/<video_id>", methods=["GET"])
@require_auth
def history_one_route(video_id):
    user_id = getattr(g, "user_id", "guest")
    item = get_history_by_video(user_id, video_id)
    if not item:
        return jsonify({"error": "Not found"}), 404
    item["_id"] = str(item["_id"])
    if hasattr(item.get("createdAt"), "isoformat"):
        item["createdAt"] = item["createdAt"].isoformat()
    return jsonify(item)

# ---------------------------------------------------------------------
# YOUTUBE SUMMARY (Frontend now calls this)
# ---------------------------------------------------------------------
@app.route("/api/youtube", methods=["POST"])
@require_auth
def youtube_route():
    """
    POST body: { "url": "<youtube url>" }
    Response: { ..., "summary": "..." }
    """
    data = request.get_json() or {}
    url = data.get("url") # Frontend sends "url"
    user_id = getattr(g, "user_id", "guest")

    if not url:
        return jsonify({"error": "Missing YouTube URL"}), 400

    video_id = extract_youtube_id(url)
    if not video_id:
        return jsonify({"error": "Invalid YouTube URL"}), 400

    transcript_text = None
    transcript_error = None
    transcript_available = False

    if YouTubeTranscriptApi is not None:
        try:
            parts = YouTubeTranscriptApi.get_transcript(
                video_id, languages=["en", "en-US", "en-GB"]
            )
            transcript_text = " ".join(p.get("text", "") for p in parts)
            transcript_available = True
        except Exception as ex:
            transcript_error = f"get_transcript error: {repr(ex)}"
            # Fallback strategy
            try:
                transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
                chosen = transcripts.find_transcript(["en", "en-US", "en-GB"]) or next(iter(transcripts), None)
                if chosen:
                    fetched = chosen.fetch()
                    transcript_text = " ".join(p.get("text", "") for p in fetched)
                    transcript_available = True
                    transcript_error = None
            except Exception as ex_fallback:
                transcript_error += f" | fallback error: {repr(ex_fallback)}"

    summary = None
    if transcript_available and model:
        try:
            prompt = (
                "Summarize the following YouTube transcript in 3–5 concise bullet points "
                "or 2–4 short paragraphs:\n\n"
                + transcript_text[:25000]
            )
            resp = model.generate_content(prompt)
            # ... (response parsing logic is the same)
            if hasattr(resp, "text"):
                summary = clean_ai_response(resp.text)
            elif isinstance(resp, dict):
                candidates = resp.get("candidates") or []
                if candidates:
                    content = candidates[0].get("content") or {}
                    summary = clean_ai_response(content.get("parts", [{}])[0].get("text") or "")
            else:
                summary = clean_ai_response(str(resp))
        except Exception as ex:
            transcript_error = (transcript_error or "") + f" | summary error: {repr(ex)}"
    elif not transcript_available:
        summary = "Could not generate a summary because no transcript was found for this video."
    
    if summary:
        try:
            save_history(
                user_id=user_id,
                video_id=video_id,
                title=summary.split("\n")[0][:120],
                summary=summary,
                mode="Video Summary",
            )
        except Exception as e:
            print(f"Failed to save history: {e}")

    return jsonify(
        {
            "videoId": video_id,
            "transcript": transcript_text if transcript_available else None,
            "transcriptError": transcript_error,
            "summary": summary, # Frontend expects this
        }
    )

# ---------------------------------------------------------------------
# NEW DOCUMENT SUMMARY ROUTE (STUB)
# ---------------------------------------------------------------------
@app.route("/api/document", methods=["POST"])
@require_auth
def document_route():
    user_id = getattr(g, "user_id", "guest")
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    prompt = request.form.get('prompt', 'summarize this document')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        filename = secure_filename(file.filename)
        
        # --- STUBBED RESPONSE ---
        # In a real app, you would install 'pypdf2' or 'python-docx',
        # read the file content, and send it to the Gemini model.
        #
        # Example (not run):
        # text = ""
        # if filename.endswith('.pdf'):
        #   from pypdf import PdfReader
        #   reader = PdfReader(file)
        #   for page in reader.pages:
        #       text += page.extract_text()
        # elif filename.endswith('.docx'):
        #   from docx import Document
        #   doc = Document(file)
        #   for para in doc.paragraphs:
        #       text += para.text + "\n"
        #
        # resp = model.generate_content(f"{prompt}:\n\n{text[:20000]}")
        # ai_response = resp.text
        
        # For now, we'll just return a stubbed response.
        ai_response = f"File '{filename}' received. Document processing is not yet implemented in this demo."
        
        try:
            save_history(
                user_id=user_id,
                video_id=filename, # Use filename as ID
                title=f"Doc: {filename}",
                summary=ai_response,
                mode="Document Summary",
            )
        except Exception as e:
            print(f"Failed to save doc history: {e}")

        # Frontend expects { "summary": "..." }
        return jsonify({"summary": ai_response})

    return jsonify({"error": "File processing failed"}), 500


# ---------------------------------------------------------------------
# Run Server
# ---------------------------------------------------------------------
if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "true").lower() in ("1", "true", "yes")

    app.run(
        debug=debug,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        use_reloader=False, 
    )