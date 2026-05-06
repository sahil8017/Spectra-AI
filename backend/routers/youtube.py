from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import json
from ..models.schemas import YouTubeRequest, YouTubeResponse
from ..services.youtube_service import extract_video_id, get_transcript
from ..services.llm_service import generate_response
from ..services.auth_service import get_current_user
from ..models.database_models import User

router = APIRouter(prefix="", tags=["YouTube"])

@router.post("/summarize")
async def summarize_youtube(
    request: YouTubeRequest,
    current_user: User = Depends(get_current_user)
):
    import logging
    logger = logging.getLogger("spectra-youtube")
    logger.info(f"Summarizing YouTube URL: {request.url}")
    
    try:
        video_id = extract_video_id(request.url)
        logger.info(f"Extracted Video ID: {video_id}")
    except ValueError as e:
        logger.error(f"Video ID extraction failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    try:
        transcript = get_transcript(request.url)
        logger.info(f"Transcript retrieved ({len(transcript.split())} words)")
    except Exception as e:
        logger.error(f"Transcript retrieval failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    word_count = len(transcript.split())

    length_instructions = {
        "short": "3-4 sentences covering the main idea",
        "medium": "2-3 detailed paragraphs covering the main topics",
        "long": "4-6 detailed paragraphs with a thorough breakdown"
    }
    instruction = length_instructions.get(request.summary_length, "2-3 detailed paragraphs")

    prompt = (
        f"You are an expert content analyst. Below is a transcript from a YouTube video.\n\n"
        f"Task 1: Write a {instruction} summary. Make it clear and engaging.\n"
        f"Task 2: Below the summary, provide exactly 5 detailed key points as bullet points (use '- ' format).\n\n"
        f"Format your response EXACTLY like this:\n"
        f"## 📹 Video Summary\n[Your summary here]\n\n---\n\n## 🔑 Key Points\n[Your key points here]\n\n"
        f"Transcript:\n{transcript}"
    )

    def sse_generator():
        # First yield the metadata
        metadata = {
            "type": "metadata",
            "video_id": video_id,
            "transcript_length": word_count
        }
        yield f"data: {json.dumps(metadata)}\n\n"
        
        # Then stream the text
        stream = generate_response(prompt, stream=True)
        for chunk in stream:
            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
