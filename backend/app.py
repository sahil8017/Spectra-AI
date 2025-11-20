# backend/app.py
import os
import re
from datetime import datetime

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv
from bson import ObjectId
from werkzeug.utils import secure_filename

# ---------------------------------------------------------------------
# Local imports
# ---------------------------------------------------------------------
from backend.db import db
from backend.auth import require_auth

# Models
from backend.models.chat import create_chat, get_chat, add_to_chat, delete_chat
from backend.models.user_chats import add_user_chat, get_user_chats, remove_user_chat, delete_all_user_chats
from backend.models.history import save_history, get_all_history, get_history_by_video

# ---------------------------------------------------------------------
# Env & Config
# ---------------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash")
MAX_AI_CHARS = int(os.getenv("MAX_AI_CHARS", "5000"))

# ---------------------------------------------------------------------
# AI Model Setup
# ---------------------------------------------------------------------
try:
    import google.generativeai as genai
except ImportError:
    genai = None
    print("WARNING: google-generativeai library missing.")

model = None
if genai and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(MODEL_NAME)
    except Exception as e:
        print("Gemini init error:", e)

# ---------------------------------------------------------------------
# YouTube Transcript
# ---------------------------------------------------------------------
try:
    from youtube_transcript_api import YouTubeTranscriptApi
except:
    YouTubeTranscriptApi = None

app = Flask(__name__)
CORS(app, supports_credentials=True)

chats_collection = db["chats"]

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def serialize_doc(doc):
    if not doc: return None
    out = dict(doc)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    for k in ("createdAt", "updatedAt"):
        if k in out and hasattr(out[k], "isoformat"):
            out[k] = out[k].isoformat()
    return out

def format_history_for_frontend(history):
    formatted = []
    for item in history:
        role = item.get("role")
        parts = item.get("parts", [])
        text = "".join([p.get("text", "") for p in parts])
        entry = {"role": role, "text": text}
        if "img" in item:
            entry["img"] = item["img"]
        formatted.append(entry)
    return formatted

def clean_ai_response(text):
    if not text:
        return ""
    s = text.strip()
    s = re.sub(r"\n{3,}", "\n\n", s)
    if len(s) > MAX_AI_CHARS:
        s = s[:MAX_AI_CHARS]
        if " " in s:
            s = s.rsplit(" ", 1)[0]
        s += "..."
    return s

def extract_youtube_id(url):
    if not url: return None
    url = url.strip()
    if "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0].split("&")[0]
    if "youtube.com" in url:
        m = re.search(r"[?&]v=([^&]+)", url)
        if m: return m.group(1)
        m2 = re.search(r"/(shorts|embed)/([^?&/]+)", url)
        if m2: return m2.group(2)
    if re.fullmatch(r"[A-Za-z0-9_-]{6,}", url):
        return url
    return None

# ---------------------------------------------------------------------
# CHAT ROUTES
# ---------------------------------------------------------------------

@app.route("/api/chats", methods=["GET", "DELETE"])
@require_auth
def chats_route():
    user_id = getattr(g, "user_id", "guest")

    if request.method == "DELETE":
        delete_all_user_chats(user_id)
        return jsonify({"success": True, "message": "All chats cleared"})

    chats = list(chats_collection.find({"userId": user_id}, {"history": 0}).sort("updatedAt", -1))
    chats = [serialize_doc(c) for c in chats]
    return jsonify({"chats": chats})


@app.route("/api/chat/<chat_id>", methods=["GET", "DELETE"])
@require_auth
def handle_chat_route(chat_id):
    user_id = getattr(g, "user_id", "guest")

    if request.method == "DELETE":
        success = delete_chat(chat_id, user_id)
        if success:
            remove_user_chat(user_id, chat_id)
            return jsonify({"success": True})
        return jsonify({"error": "Not found"}), 404

    try:
        chat = chats_collection.find_one({"_id": ObjectId(chat_id), "userId": user_id})
    except:
        return jsonify({"error": "Invalid chat id"}), 400

    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    chat = serialize_doc(chat)
    chat["history"] = format_history_for_frontend(chat.get("history", []))
    return jsonify(chat)


@app.route("/api/create-chat", methods=["POST"])
@require_auth
def create_chat_route():
    user_id = getattr(g, "user_id", "guest")
    data = request.get_json() or {}
    title = data.get("title", "New Chat")
    initial_text = data.get("text")

    chat_id = create_chat(user_id, text=initial_text, title=title)
    add_user_chat(user_id, chat_id, title)

    return jsonify({"chatId": chat_id, "title": title})


@app.route("/api/send-message", methods=["POST"])
@require_auth
def send_message_route():
    user_id = g.user_id
    data = request.get_json() or {}
    chat_id = data.get("chatId")
    text = data.get("text")

    if not chat_id or not text:
        return jsonify({"error": "Missing chatId or text"}), 400

    try:
        exists = chats_collection.find_one({"_id": ObjectId(chat_id), "userId": user_id})
    except:
        return jsonify({"error": "Invalid chat ID"}), 400

    if not exists:
        return jsonify({"error": "Chat not found"}), 404

    ai_response = "Sorry, I couldn't generate a response."

    if model:
        try:
            resp = model.generate_content(text)
            ai_response = clean_ai_response(resp.text)
        except Exception as e:
            print("Gemini error:", e)

    add_to_chat(chat_id, user_id, question=text, answer=ai_response)

    return jsonify({"user": text, "ai": ai_response})

# ---------------------------------------------------------------------
# HISTORY & YOUTUBE
# ---------------------------------------------------------------------

@app.route("/api/youtube", methods=["POST"])
@require_auth
def youtube_route():
    data = request.get_json() or {}
    url = data.get("url")
    user_id = g.user_id

    if not url:
        return jsonify({"error": "Missing URL"}), 400

    video_id = extract_youtube_id(url)
    if not video_id:
        return jsonify({"error": "Invalid YouTube URL"}), 400

    transcript = None
    transcript_error = ""

    if YouTubeTranscriptApi:
        try:
            fetched = YouTubeTranscriptApi.get_transcript(video_id)
            transcript = " ".join([item["text"] for item in fetched])
        except Exception as e:
            transcript_error = str(e)

    summary = None
    if transcript and model:
        try:
            prompt = (
                "Summarize this YouTube transcript in 3–5 key points:\n\n" +
                transcript[:25000]
            )
            resp = model.generate_content(prompt)
            summary = clean_ai_response(resp.text)
        except Exception as e:
            summary = f"AI Error: {e}"

    if transcript and summary:
        save_history(
            user_id=user_id,
            video_id=video_id,
            title=summary[:80],
            summary=summary,
            mode="Video Summary"
        )

    return jsonify({
        "videoId": video_id,
        "transcript": transcript,
        "transcriptError": transcript_error,
        "summary": summary
    })


# ---------------------------------------------------------------------
# DOCUMENT SUMMARIES
# ---------------------------------------------------------------------

@app.route("/api/document", methods=["POST"])
@require_auth
def document_route():
    user_id = g.user_id

    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename)
    ext = filename.lower().split(".")[-1]

    text = ""

    try:
        if ext == "pdf":
            import PyPDF2
            reader = PyPDF2.PdfReader(file.stream)
            for page in reader.pages:
                t = page.extract_text() or ""
                text += t + "\n"

        elif ext == "docx":
            from docx import Document
            doc = Document(file)
            for p in doc.paragraphs:
                text += p.text + "\n"

        elif ext == "txt":
            text = file.read().decode("utf-8", errors="ignore")

        else:
            return jsonify({"error": "Unsupported format"}), 400

    except Exception as e:
        return jsonify({"error": f"Read error: {e}"}), 500

    summary = "Could not summarize."

    if model and text.strip():
        try:
            prompt = "Summarize this document in 3–6 bullet points:\n\n" + text[:25000]
            resp = model.generate_content(prompt)
            summary = clean_ai_response(resp.text)
        except Exception as e:
            summary = f"AI Error: {e}"

    save_history(
        user_id=user_id,
        video_id=filename,
        title=f"Doc: {filename}",
        summary=summary,
        mode="Document Summary"
    )

    return jsonify({"file": filename, "summary": summary})


# ---------------------------------------------------------------------

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "true").lower() in ("1", "true")
    app.run(debug=debug, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
