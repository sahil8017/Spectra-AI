from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest, ChatResponse
from services.llm_service import generate_response
import uuid

router = APIRouter()

@router.post("")
async def chat_endpoint(request: ChatRequest):
    try:
        def sse_generator():
            stream = generate_response(request.message, history=request.history, stream=True)
            for chunk in stream:
                # Replace newlines with a special token or just send as JSON
                import json
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(sse_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
