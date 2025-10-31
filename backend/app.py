import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
import PyPDF2
from docx import Document
# --- FINAL CORRECTED IMPORT ---
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
try:
    # Python 3.8+: importlib.metadata is in stdlib
    from importlib.metadata import version as _pkg_version, PackageNotFoundError as _PkgNotFound
except Exception:  # pragma: no cover
    _pkg_version = None
    _PkgNotFound = Exception

# --- Initialize Flask App and enable Cross-Origin Resource Sharing ---
app = Flask(__name__)
CORS(app) # This is crucial for React (port 5173) to talk to Flask (port 5000)

# --- Load environment variables from your .env file ---
load_dotenv()

# --- Configure Google Gemini API Key ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY not found in .env file. API calls will fail.")


# --- Prompts for the AI Model ---

CHAT_PROMPT = """
You are a helpful and friendly AI assistant. A user is asking you a question.
Provide a clear, concise, and helpful response.
Use markdown formatting (like bullet points, bold text) if it makes the answer easier to understand.

User's Question:
"""

VIDEO_PROMPT_TEMPLATE = """
You are a world-class academic assistant. Your task is to analyze a YouTube video transcript.
A user has provided a transcript and may also provide a specific prompt or question about it.

**If the user provides a prompt, answer their question using the transcript as context.**
**If the user does not provide a prompt, your task is to summarize the transcript into high-quality, structured study notes.**

When summarizing (if no prompt is given), follow these instructions and OUTPUT RULES:
1.  Main Title 🏷️: Start with a clear, concise title for the notes.
2.  Key Takeaways 🎯: Provide 3-5 succinct bullets.
3.  Detailed Notes 📚: Organize into logical sections with clear subheadings.
4.  OUTPUT RULES: Return PLAIN TEXT ONLY (no Markdown markers like *, #, _, ```). Use simple bullets like "- " and include emojis as above.

---
User's Prompt: "{user_prompt}"
---
Video Transcript:
"""

DOCUMENT_PROMPT = """
You are a professional research analyst. Your task is to summarize a document into a structured, easy-to-digest report.

Follow these instructions precisely and OUTPUT RULES:
1.  Title 🏷️: Start with a clear title for the summary.
2.  Executive Summary 🧾: Provide a short paragraph encapsulating the main points.
3.  Detailed Analysis 📚: Break down into thematic sections with clear subheadings.
4.  OUTPUT RULES: Return PLAIN TEXT ONLY (no Markdown markers like *, #, _, ```). Use simple bullets like "- " and include emojis as above.
5.  Tone: Maintain a professional and objective tone.

Here is the document content:
"""

# --- Helper Functions to Process Inputs ---
def extract_video_id_from_url(url):
    """Extracts the 11-character video ID from a YouTube URL."""
    regex = r'(https?://)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)/(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
    match = re.search(regex, url)
    if not match:
        raise ValueError("Could not parse YouTube URL. Please provide a valid link.")
    return match.group(6)

def get_video_transcript(video_id):
    """Fetches the transcript for a given YouTube video ID.

    Strategy:
    1) Try English transcripts directly.
    2) If not found, list available transcripts and:
       - Prefer manual English if available
       - Otherwise, translate to English if translation is supported
       - Finally, fallback to the first available transcript language
    """
    preferred_english_langs = ["en", "en-US", "en-GB"]

    # Support both API styles:
    # - Legacy (<=0.6.x): class-level static methods: YouTubeTranscriptApi.get_transcript / list_transcripts
    # - Modern (>=1.x): instance methods: YouTubeTranscriptApi().fetch / .list
    has_static_get = hasattr(YouTubeTranscriptApi, "get_transcript")
    has_instance_fetch = False
    try:
        has_instance_fetch = hasattr(YouTubeTranscriptApi(), "fetch")
    except Exception:
        has_instance_fetch = False
    if not has_static_get and not has_instance_fetch:
        # Neither API shape is available: provide a clear guidance
        try:
            installed = _pkg_version("youtube-transcript-api") if _pkg_version else "unknown"
        except _PkgNotFound:
            installed = "not installed"
        raise RuntimeError(
            "YouTube transcript dependency is incompatible. Please install/upgrade 'youtube-transcript-api' to a recent version (>=0.6.2). "
            f"(installed: {installed})."
        )

    def _join_text(parts):
        """Normalize transcript parts across library versions."""
        try:
            # Modern API (>1.x): parts is FetchedTranscript or list of FetchedTranscriptSnippet
            if hasattr(parts, "transcript"):
                return " ".join(snippet.text for snippet in parts.transcript)
            # If it's a list of snippet objects
            if parts and hasattr(parts[0], "text"):
                return " ".join(snippet.text for snippet in parts)
            # Legacy API (<=0.6.x): list of dicts with 'text'
            return " ".join(item["text"] for item in parts)
        except Exception:
            # Last resort: cast items to str and join
            return " ".join(str(x) for x in parts)

    # Try direct fetch with English preferences
    try:
        if has_static_get:
            transcript_list = YouTubeTranscriptApi.get_transcript(
                video_id,
                languages=preferred_english_langs,
            )
            return _join_text(transcript_list)
        else:
            # modern API
            fetched = YouTubeTranscriptApi().fetch(
                video_id,
                languages=tuple(preferred_english_langs),
            )
            return _join_text(fetched)
    except NoTranscriptFound:
        # Continue to broader strategy
        pass
    except TranscriptsDisabled:
        raise ValueError("Transcripts are disabled for this video.")
    except Exception as e:
        print(f"Error fetching transcript (direct) for {video_id}: {e}")
        # Continue to broader strategy as there might still be translatable tracks

    # Broader strategy using list_transcripts (defensive against lib differences)
    try:
        if has_static_get and not hasattr(YouTubeTranscriptApi, "list_transcripts"):
            # Older library version: try broad language guesses directly
            broad_langs = [
                "en","en-US","en-GB","en-IN",
                "es","es-419","pt","pt-BR","fr","de","it","nl","ru",
                "hi","bn","ur","ta","te","ml","mr","gu","pa",
                "id","ms","th","vi","tr","ar","fa","he","ja","ko","zh","zh-Hans","zh-Hant"
            ]
            try:
                transcript_list_direct = YouTubeTranscriptApi.get_transcript(
                    video_id, languages=broad_langs
                )
                return _join_text(transcript_list_direct)
            except Exception as e:
                print(f"Broad languages get_transcript failed for {video_id}: {e}")
                raise ConnectionError(
                    f"Failed to retrieve transcript without listing: {type(e).__name__} - {e}"
                )

        # list_transcripts can fail with HTML/XML parse errors or region/network issues.
        # If it does, fall back to a broad direct get_transcript attempt before giving up.
        try:
            if has_static_get:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            else:
                transcript_list = YouTubeTranscriptApi().list(video_id)
        except Exception as e:
            print(f"list_transcripts failed for {video_id}: {e}. Falling back to broad direct fetch.")
            broad_langs = [
                "en","en-US","en-GB","en-IN",
                "es","es-419","pt","pt-BR","fr","de","it","nl","ru",
                "hi","bn","ur","ta","te","ml","mr","gu","pa",
                "id","ms","th","vi","tr","ar","fa","he","ja","ko","zh","zh-Hans","zh-Hant"
            ]
            try:
                transcript_list_direct = YouTubeTranscriptApi.get_transcript(
                    video_id, languages=broad_langs
                )
                return " ".join(item["text"] for item in transcript_list_direct)
            except Exception as inner:
                print(f"Fallback broad get_transcript also failed for {video_id}: {inner}")
                raise ConnectionError(
                    f"Failed to retrieve transcript via listing: {type(e).__name__} - {e}"
                )

        # 1) Prefer manual English transcript
        for lang in preferred_english_langs:
            try:
                t = transcript_list.find_manually_created_transcript([lang])
                parts = t.fetch()
                return _join_text(parts)
            except NoTranscriptFound:
                continue

        # 2) Prefer autogenerated English transcript
        for lang in preferred_english_langs:
            try:
                t = transcript_list.find_generated_transcript([lang])
                parts = t.fetch()
                return _join_text(parts)
            except NoTranscriptFound:
                continue

        # 3) Try translating any transcript to English
        for transcript in list(transcript_list):
            if transcript.is_translatable:
                try:
                    translated = transcript.translate("en")
                    parts = translated.fetch()
                    return _join_text(parts)
                except Exception:
                    continue

        # 4) Fallback: use the first available transcript (any language)
        try:
            items = list(transcript_list)
            any_transcript = items[0] if items else None
            if not any_transcript:
                raise StopIteration()
            parts = any_transcript.fetch()
            return _join_text(parts)
        except StopIteration:
            pass

        raise ValueError("No transcripts available or translatable for this video.")
    except TranscriptsDisabled:
        raise ValueError("Transcripts are disabled for this video.")
    except NoTranscriptFound:
        raise ValueError("No transcript tracks were found for this video.")
    except Exception as e:
        print(f"Error listing/fetching transcripts for {video_id}: {e}")
        raise ConnectionError(
            f"Failed to retrieve transcript via listing: {type(e).__name__} - {e}"
        )


def get_text_from_pdf(file_stream):
    """Extracts text from an uploaded PDF file stream."""
    reader = PyPDF2.PdfReader(file_stream)
    return "".join(page.extract_text() for page in reader.pages).strip()

def get_text_from_docx(file_stream):
    """Extracts text from an uploaded DOCX file stream."""
    doc = Document(file_stream)
    return "\n".join([para.text for para in doc.paragraphs]).strip()

def get_summary_from_gemini(text, prompt_template, user_prompt=""):
    """Generates a summary using the configured AI model."""
    if not GOOGLE_API_KEY:
        raise ValueError("Google API key is not configured. Cannot generate summary.")

    model = genai.GenerativeModel("gemini-2.5-pro")

    if "{user_prompt}" in prompt_template:
        final_prompt = prompt_template.format(user_prompt=user_prompt or "N/A - Summarize the content")
    else:
        final_prompt = prompt_template

    final_prompt += text

    try:
        response = model.generate_content(final_prompt)
        # Add basic error handling for empty response
        if not response.parts:
             raise ValueError("AI model returned an empty response.")
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        # Improve error message detail
        raise ConnectionError(f"Failed to generate content from AI model: {type(e).__name__} - {e}")


def _postprocess_plain_text(summary: str) -> str:
    """Convert common Markdown artifacts to plain text and add section emojis.

    This keeps output readable in plain text UIs while preserving structure.
    """
    if not summary:
        return summary

    # Remove common Markdown markers
    replacements = [
        ("**", ""), ("__", ""), ("`", ""), ("***", ""), ("---", ""),
    ]
    for a, b in replacements:
        summary = summary.replace(a, b)

    # Strip leading heading markers (e.g., #, ##, ###)
    lines = summary.splitlines()
    cleaned_lines = []
    for line in lines:
        stripped = line.lstrip()
        while stripped.startswith("#"):
            stripped = stripped.lstrip("#").lstrip()
        # Normalize bullets
        for bullet in ("* ", "- ", "• "):
            if stripped.startswith(bullet):
                stripped = "- " + stripped[len(bullet):]
                break
        cleaned_lines.append(stripped)

    summary = "\n".join(cleaned_lines)

    # Add emojis to known section headers if present
    summary = summary.replace("Main Title:", "Main Title 🏷️:")
    summary = summary.replace("Key Takeaways:", "Key Takeaways 🎯:")
    summary = summary.replace("Detailed Notes:", "Detailed Notes 📚:")
    summary = summary.replace("Executive Summary:", "Executive Summary 🧾:")
    summary = summary.replace("Detailed Analysis:", "Detailed Analysis 📚:")

    return summary


# --- API Endpoints ---

@app.route("/api/chat", methods=['POST'])
def chat_endpoint():
    """Endpoint to handle general chat messages."""
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({"error": "Missing 'prompt' in request body."}), 400

        prompt_text = data['prompt']
        response_text = get_summary_from_gemini(prompt_text, CHAT_PROMPT)
        response_text = _postprocess_plain_text(response_text)

        return jsonify({"summary": response_text})

    except Exception as e:
        print(f"Error in /api/chat: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/summarize-youtube", methods=['POST'])
def youtube_summary_endpoint():
    """Endpoint to handle YouTube video summarization requests."""
    try:
        data = request.get_json()
        if not data or 'youtube_url' not in data:
            return jsonify({"error": "Missing 'youtube_url' in request body."}), 400

        youtube_url = data['youtube_url']
        user_prompt = data.get('prompt', '')

        video_id = extract_video_id_from_url(youtube_url)
        transcript = get_video_transcript(video_id)

        summary = get_summary_from_gemini(transcript, VIDEO_PROMPT_TEMPLATE, user_prompt)
        summary = _postprocess_plain_text(summary)

        return jsonify({"summary": summary})

    except Exception as e:
        print(f"Error in /api/summarize-youtube: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/summarize-document", methods=['POST'])
def document_summary_endpoint():
    """Endpoint to handle document summarization requests."""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file was uploaded."}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected."}), 400

        text = ""
        if file.filename.endswith('.pdf'):
            text = get_text_from_pdf(file.stream)
        elif file.filename.endswith('.docx'):
            text = get_text_from_docx(file.stream)
        else:
            return jsonify({"error": "Invalid file type. Please upload a .pdf or .docx."}), 400

        if not text or len(text.strip()) < 100:
            return jsonify({"error": "The document is empty or too short to summarize."}), 400

        summary = get_summary_from_gemini(text, DOCUMENT_PROMPT)
        summary = _postprocess_plain_text(summary)
        return jsonify({"summary": summary})

    except Exception as e:
        print(f"Error in /api/summarize-document: {e}")
        return jsonify({"error": str(e)}), 500

# Simple health endpoint
@app.route("/api/health", methods=["GET"]) 
def health():
    return jsonify({"status": "ok"})

# --- Main execution block ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)