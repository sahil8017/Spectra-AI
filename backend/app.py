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
from backend.models.chat import create_chat, get_chat, add_to_chat, delete_chat
from backend.models.user_chats import add_user_chat, get_user_chats, remove_user_chat, delete_all_user_chats
from backend.models.history import save_history, get_all_history, get_history_by_video


# ---------------------------------------------------------------------
# Env & Config
# ---------------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.0-flash-exp")
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
        print(f"Gemini init error: {e}")

# ---------------------------------------------------------------------
# YouTube Transcript
# ---------------------------------------------------------------------
try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None
    print("WARNING: youtube-transcript-api library missing.")

# ---------------------------------------------------------------------
# Document Processing Libraries
# ---------------------------------------------------------------------
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None
    print("WARNING: PyPDF2 library missing.")

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None
    print("WARNING: python-docx library missing.")

# ---------------------------------------------------------------------
# Flask App Setup
# ---------------------------------------------------------------------
app = Flask(__name__)
CORS(app, supports_credentials=True)

chats_collection = db["chats"]

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
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
    """Format chat history for frontend consumption"""
    formatted = []
    for item in history:
        role = item.get("role", "user")
        parts = item.get("parts", [])
        text = "".join([p.get("text", "") for p in parts if isinstance(p, dict)])
        entry = {"role": role, "text": text}
        if "img" in item:
            entry["img"] = item["img"]
        formatted.append(entry)
    return formatted


def clean_ai_response(text):
    """Clean and truncate AI response"""
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
    """Extract YouTube video ID from various URL formats"""
    if not url:
        return None
    url = url.strip()
    
    # youtu.be format
    if "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0].split("&")[0]
    
    # youtube.com format
    if "youtube.com" in url:
        # Standard watch URL
        m = re.search(r"[?&]v=([^&]+)", url)
        if m:
            return m.group(1)
        # Shorts or embed URL
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

@app.route("/api/chats", methods=["GET", "DELETE"])
@require_auth
def chats_route():
    """Get all chats or delete all chats for a user"""
    user_id = getattr(g, "user_id", "guest")

    if request.method == "DELETE":
        try:
            delete_all_user_chats(user_id)
            return jsonify({"success": True, "message": "All chats cleared"})
        except Exception as e:
            print(f"Error deleting chats: {e}")
            return jsonify({"error": "Failed to delete chats"}), 500

    try:
        chats = list(chats_collection.find(
            {"userId": user_id}, 
            {"history": 0}
        ).sort("updatedAt", -1))
        chats = [serialize_doc(c) for c in chats]
        return jsonify({"chats": chats})
    except Exception as e:
        print(f"Error fetching chats: {e}")
        return jsonify({"error": "Failed to fetch chats"}), 500


@app.route("/api/chat/<chat_id>", methods=["GET", "DELETE"])
@require_auth
def handle_chat_route(chat_id):
    """Get or delete a specific chat"""
    user_id = getattr(g, "user_id", "guest")

    if request.method == "DELETE":
        try:
            success = delete_chat(chat_id, user_id)
            if success:
                remove_user_chat(user_id, chat_id)
                return jsonify({"success": True})
            return jsonify({"error": "Chat not found"}), 404
        except Exception as e:
            print(f"Error deleting chat: {e}")
            return jsonify({"error": "Failed to delete chat"}), 500

    try:
        chat = chats_collection.find_one({"_id": ObjectId(chat_id), "userId": user_id})
    except Exception as e:
        print(f"Invalid chat ID: {e}")
        return jsonify({"error": "Invalid chat ID"}), 400

    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    try:
        chat = serialize_doc(chat)
        chat["history"] = format_history_for_frontend(chat.get("history", []))
        return jsonify(chat)
    except Exception as e:
        print(f"Error formatting chat: {e}")
        return jsonify({"error": "Failed to format chat"}), 500


@app.route("/api/create-chat", methods=["POST"])
@require_auth
def create_chat_route():
    """Create a new chat"""
    user_id = getattr(g, "user_id", "guest")
    data = request.get_json() or {}
    title = data.get("title", "New Chat")
    initial_text = data.get("text")

    try:
        chat_id = create_chat(user_id, text=initial_text, title=title)
        add_user_chat(user_id, chat_id, title)
        return jsonify({"chatId": chat_id, "title": title})
    except Exception as e:
        print(f"Error creating chat: {e}")
        return jsonify({"error": "Failed to create chat"}), 500


@app.route("/api/send-message", methods=["POST"])
@require_auth
def send_message_route():
    """Send a message in a chat and get AI response"""
    user_id = g.user_id
    data = request.get_json() or {}
    chat_id = data.get("chatId")
    text = data.get("text")

    if not chat_id or not text:
        return jsonify({"error": "Missing chatId or text"}), 400

    try:
        exists = chats_collection.find_one({"_id": ObjectId(chat_id), "userId": user_id})
    except Exception as e:
        print(f"Invalid chat ID: {e}")
        return jsonify({"error": "Invalid chat ID"}), 400

    if not exists:
        return jsonify({"error": "Chat not found"}), 404

    ai_response = "Sorry, I couldn't generate a response."

    if model:
        try:
            resp = model.generate_content(text)
            if hasattr(resp, 'text') and resp.text:
                ai_response = clean_ai_response(resp.text)
            else:
                ai_response = "No response generated from AI model."
        except Exception as e:
            print(f"Gemini error: {e}")
            ai_response = f"AI Error: {str(e)}"

    try:
        add_to_chat(chat_id, user_id, question=text, answer=ai_response)
    except Exception as e:
        print(f"Error saving to chat: {e}")
        return jsonify({"error": "Failed to save message"}), 500

    return jsonify({"user": text, "ai": ai_response})


# ---------------------------------------------------------------------
# HISTORY & YOUTUBE
# ---------------------------------------------------------------------
@app.route("/api/youtube", methods=["POST"])
@require_auth
def youtube_route():
    """Process YouTube video and generate summary"""
    data = request.get_json() or {}
    url = data.get("url")
    user_id = g.user_id

    if not url:
        return jsonify({"error": "Missing URL"}), 400

    video_id = extract_youtube_id(url)
    if not video_id:
        return jsonify({"error": "Invalid YouTube URL"}), 400

    print(f"Processing video ID: {video_id}")

    transcript = None
    transcript_error = ""
    summary = None

    # Fetch transcript using NEW API (v1.2.0+)
    if not YouTubeTranscriptApi:
        transcript_error = "YouTube Transcript API not available. Install: pip install youtube-transcript-api"
    else:
        try:
            # Create API instance (NEW METHOD)
            ytt_api = YouTubeTranscriptApi()
            
            # Method 1: Try to fetch transcript directly
            try:
                fetched_transcript = ytt_api.fetch(video_id, languages=['en', 'en-US'])
                transcript = " ".join([snippet.text for snippet in fetched_transcript])
                print(f"✓ Transcript fetched successfully: {len(transcript)} characters")
                
            except Exception as e1:
                print(f"Direct fetch failed: {e1}")
                
                # Method 2: List available transcripts and pick one
                try:
                    transcript_list = ytt_api.list(video_id)
                    print(f"Available transcripts: {[(t.language, t.language_code) for t in transcript_list]}")
                    
                    # Try to find English transcript first
                    try:
                        transcript_obj = transcript_list.find_transcript(['en', 'en-US'])
                    except:
                        # If no English, get any manually created transcript
                        try:
                            transcript_obj = transcript_list.find_manually_created_transcript()
                        except:
                            # Last resort: get any generated transcript
                            transcript_obj = transcript_list.find_generated_transcript()
                    
                    # Fetch the selected transcript
                    fetched_transcript = transcript_obj.fetch()
                    transcript = " ".join([snippet.text for snippet in fetched_transcript])
                    print(f"✓ Transcript fetched in {transcript_obj.language}: {len(transcript)} characters")
                    
                except Exception as e2:
                    print(f"List method failed: {e2}")
                    raise e1  # Re-raise original error
                    
        except Exception as e:
            error_msg = str(e).lower()
            print(f"❌ Transcript error: {e}")
            
            # Specific error messages
            if "no transcript" in error_msg or "could not retrieve" in error_msg:
                transcript_error = "No transcripts/captions are available for this video."
            elif "subtitles are disabled" in error_msg:
                transcript_error = "Subtitles are disabled for this video by the uploader."
            elif "video unavailable" in error_msg or "video does not exist" in error_msg:
                transcript_error = "This video is unavailable, private, or has been removed."
            elif "too many requests" in error_msg or "rate limit" in error_msg:
                transcript_error = "YouTube is temporarily blocking requests. Please wait and try again."
            elif "private" in error_msg or "members-only" in error_msg:
                transcript_error = "This video is private or members-only."
            else:
                transcript_error = f"Could not fetch transcript: {str(e)}"

    # Debug: Check if transcript was fetched
    if transcript:
        print(f"✓ Transcript available: {len(transcript)} characters")
    else:
        print(f"❌ No transcript available. Error: {transcript_error}")

    # Generate summary
    if transcript and model:
        try:
            print("Generating AI summary...")
            truncated_transcript = transcript[:25000]
            
            prompt = f"""Summarize this YouTube video transcript in a clear, structured format:

Title: [Create a descriptive title]

Main Topic:
[What is this video about in 1-2 sentences]

Key Points:
1. [First main point]
2. [Second main point]
3. [Third main point]
4. [Fourth main point]
5. [Fifth main point]

Conclusion:
[Final takeaway in 1-2 sentences]

Transcript:
{truncated_transcript}"""

            resp = model.generate_content(prompt)
            
            # Handle response
            if hasattr(resp, 'text') and resp.text:
                summary = clean_ai_response(resp.text)
                print(f"✓ Summary generated: {len(summary)} characters")
            elif hasattr(resp, 'parts') and len(resp.parts) > 0:
                summary = clean_ai_response(resp.parts[0].text)
                print(f"✓ Summary generated from parts: {len(summary)} characters")
            else:
                summary = "Unable to generate summary from response"
                print("❌ No text in AI response")
            
            if not summary or summary.strip() == "":
                summary = "Unable to generate summary from transcript"
                
        except Exception as e:
            summary = f"AI generation error: {str(e)}"
            print(f"❌ AI Generation Error: {e}")
    elif transcript and not model:
        summary = "AI model not available. Please configure GEMINI_API_KEY."
        print("❌ No AI model configured")
    elif not transcript:
        summary = transcript_error or "No transcript available to summarize."
        print(f"❌ No transcript to summarize")

    # Save to history (only if successful)
    if transcript and summary and not any(summary.startswith(prefix) for prefix in ["AI", "Unable", "Could not", "No transcript"]):
        try:
            # Extract title from summary
            title = "YouTube Video Summary"
            if "Title:" in summary:
                title_line = summary.split("Title:")[1].split("\n")[0].strip()
                title_line = title_line.replace("[", "").replace("]", "")
                if title_line and len(title_line) > 0:
                    title = title_line[:80]
            else:
                lines = [line.strip() for line in summary.split("\n") if line.strip()]
                if lines:
                    title = lines[0][:80]
            
            save_history(
                user_id=user_id,
                video_id=video_id,
                title=title,
                summary=summary,
                mode="Video Summary"
            )
            print(f"✓ History saved: {title}")
        except Exception as e:
            print(f"Error saving history: {e}")

    return jsonify({
        "videoId": video_id,
        "transcript": transcript,
        "transcriptError": transcript_error if transcript_error else None,
        "summary": summary
    })


# ---------------------------------------------------------------------
# DOCUMENT SUMMARIES
# ---------------------------------------------------------------------

@app.route("/api/document", methods=["POST"])
@require_auth
def document_route():
    """Process document upload and generate summary"""
    user_id = g.user_id

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    filename = secure_filename(file.filename)
    ext = filename.lower().split(".")[-1] if "." in filename else ""

    print(f"Processing document: {filename} (type: {ext})")

    text = ""
    page_count = 0

    try:
        if ext == "pdf":
            if not PyPDF2:
                return jsonify({"error": "PDF support not available. Install: pip install PyPDF2"}), 500
            
            try:
                reader = PyPDF2.PdfReader(file.stream)
                page_count = len(reader.pages)
                print(f"PDF has {page_count} pages")
                
                for i, page in enumerate(reader.pages):
                    try:
                        page_text = page.extract_text() or ""
                        if page_text.strip():  # Only add non-empty pages
                            text += f"\n--- Page {i+1} ---\n{page_text}"
                    except Exception as page_error:
                        print(f"Error extracting page {i+1}: {page_error}")
                        continue
                
                print(f"✓ Extracted {len(text)} characters from PDF")
                
            except PyPDF2.errors.PdfReadError as e:
                return jsonify({"error": "Invalid or corrupted PDF file"}), 400
            except Exception as e:
                return jsonify({"error": f"Failed to read PDF: {str(e)}"}), 500

        elif ext == "docx":
            if not DocxDocument:
                return jsonify({"error": "DOCX support not available. Install: pip install python-docx"}), 500
            
            try:
                doc = DocxDocument(file)
                paragraphs = []
                
                for paragraph in doc.paragraphs:
                    para_text = paragraph.text.strip()
                    if para_text:  # Only add non-empty paragraphs
                        paragraphs.append(para_text)
                
                text = "\n\n".join(paragraphs)
                print(f"✓ Extracted {len(paragraphs)} paragraphs from DOCX")
                
            except Exception as e:
                return jsonify({"error": f"Failed to read DOCX: {str(e)}"}), 500

        elif ext == "txt":
            try:
                text = file.read().decode("utf-8", errors="ignore")
                print(f"✓ Extracted {len(text)} characters from TXT")
            except Exception as e:
                return jsonify({"error": f"Failed to read TXT file: {str(e)}"}), 500

        else:
            return jsonify({"error": f"Unsupported file format: {ext}. Supported formats: PDF, DOCX, TXT"}), 400

    except Exception as e:
        print(f"File read error: {e}")
        return jsonify({"error": f"Failed to process file: {str(e)}"}), 500

    # Clean up extracted text
    text = text.strip()
    
    if not text:
        return jsonify({"error": "No text content found in document. The file may be empty, contain only images, or be corrupted."}), 400

    print(f"Total extracted text: {len(text)} characters")

    summary = "Could not generate summary."

    if model:
        try:
            # Truncate very long documents but keep context
            max_chars = 30000  # Increased limit for better context
            truncated_text = text[:max_chars]
            was_truncated = len(text) > max_chars
            
            # Enhanced prompt with better structure and instructions
            prompt = f"""You are an expert document analyzer. Analyze and summarize the following document comprehensively.

**Document Information:**
- Filename: {filename}
- Type: {ext.upper()}
{f'- Pages: {page_count}' if page_count > 0 else ''}
- Length: {len(text):,} characters
{f'- Note: This is a preview of the first {max_chars:,} characters' if was_truncated else ''}

**Your Task:**
Create a comprehensive yet concise summary following this structure:

**📄 Document Title/Subject**
[Provide a clear, descriptive title based on the content]

**📋 Main Purpose**
[Explain what this document is about in 2-3 sentences]

**🔑 Key Points**
1. [First major point or finding]
2. [Second major point or finding]
3. [Third major point or finding]
4. [Fourth major point or finding - if applicable]
5. [Fifth major point or finding - if applicable]

**💡 Important Details**
- [Critical fact, statistic, or detail #1]
- [Critical fact, statistic, or detail #2]
- [Critical fact, statistic, or detail #3]

**✅ Conclusions/Recommendations**
[Summarize the main conclusions, recommendations, or takeaways in 2-3 sentences]

**Instructions:**
- Be factual and objective
- Use clear, professional language
- Highlight numbers, dates, and specific data when present
- Focus on actionable insights
- Keep the summary concise but informative

**Document Content:**
{truncated_text}

Now provide the summary following the structure above:"""

            print("Generating AI summary with enhanced prompt...")
            resp = model.generate_content(prompt)
            
            if hasattr(resp, 'text') and resp.text:
                summary = clean_ai_response(resp.text)
                print(f"✓ Summary generated: {len(summary)} characters")
            elif hasattr(resp, 'parts') and len(resp.parts) > 0:
                summary = clean_ai_response(resp.parts[0].text)
                print(f"✓ Summary generated from parts: {len(summary)} characters")
            else:
                summary = "AI model returned empty response. The document content may be too complex or contain unsupported characters."
                print("❌ No text in AI response")
            
            # Fallback check
            if not summary or summary.strip() == "":
                summary = "Unable to generate summary. Please try a different document or check the content."
                
        except Exception as e:
            summary = f"AI generation error: {str(e)}"
            print(f"❌ Document summary error: {e}")
    else:
        summary = "AI model not available. Please configure GEMINI_API_KEY in your environment variables."
        print("❌ No AI model configured")

    # Save to history (only if successful)
    if summary and not any(summary.startswith(prefix) for prefix in ["AI generation error", "Could not generate", "Unable to generate", "AI model not available"]):
        try:
            # Extract title from summary
            title = f"Document: {filename}"
            
            # Try to extract a better title from the summary
            if "**📄 Document Title/Subject**" in summary:
                title_section = summary.split("**📄 Document Title/Subject**")[1].split("**")[0].strip()
                if title_section and len(title_section) > 0:
                    title = title_section[:100]
            elif "Document Title" in summary or "Title:" in summary:
                for line in summary.split("\n"):
                    if "title" in line.lower() and len(line.strip()) > 5:
                        title = line.split(":")[-1].strip()[:100]
                        break
            
            save_history(
                user_id=user_id,
                video_id=filename,
                title=title,
                summary=summary,
                mode="Document Summary"
            )
            print(f"✓ Document history saved: {title}")
        except Exception as e:
            print(f"Error saving document history: {e}")

    return jsonify({
        "file": filename,
        "summary": summary,
        "metadata": {
            "fileType": ext.upper(),
            "textLength": len(text),
            "pageCount": page_count if page_count > 0 else None,
            "wasTruncated": len(text) > 30000
        }
    })

# ---------------------------------------------------------------------
# HISTORY ROUTES
# ---------------------------------------------------------------------

@app.route("/api/history", methods=["GET"])
@require_auth
def get_history_route():
    """Get all history for user"""
    user_id = g.user_id
    try:
        history = get_all_history(user_id)
        return jsonify({"history": history})
    except Exception as e:
        print(f"Error fetching history: {e}")
        return jsonify({"error": "Failed to fetch history"}), 500


@app.route("/api/history/<video_id>", methods=["GET"])
@require_auth
def get_video_history_route(video_id):
    """Get history for specific video"""
    user_id = g.user_id
    try:
        history = get_history_by_video(user_id, video_id)
        if history:
            return jsonify(history)
        return jsonify({"error": "History not found"}), 404
    except Exception as e:
        print(f"Error fetching video history: {e}")
        return jsonify({"error": "Failed to fetch history"}), 500


# ---------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "model_available": model is not None,
        "youtube_api_available": YouTubeTranscriptApi is not None,
        "pdf_support": PyPDF2 is not None,
        "docx_support": DocxDocument is not None
    })


# ---------------------------------------------------------------------
# ERROR HANDLERS
# ---------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ---------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "true").lower() in ("1", "true")
    port = int(os.getenv("PORT", 5000))
    
    print(f"Starting Flask app on port {port}...")
    print(f"Debug mode: {debug}")
    print(f"Model available: {model is not None}")
    
    app.run(debug=debug, host="0.0.0.0", port=port)