from fastapi import APIRouter, HTTPException, UploadFile, File
from models.schemas import DocumentQueryRequest, DocumentResponse
from services.document_service import extract_pdf_text
from services.rag_service import store_document, retrieve_context
from services.llm_service import generate_with_context
import uuid
from datetime import datetime, timezone

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        # Use async read + copy to bytes to avoid Windows SpooledTemporaryFile Errno 22
        raw = await file.read()
        content = bytes(raw)  # Force a clean copy out of the spool buffer
        
        text = extract_pdf_text(content)
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. The file may be scanned/image-only.")

        doc_id = str(uuid.uuid4())
        metadata = {
            "filename": file.filename,
            "upload_time": datetime.now(timezone.utc).isoformat()
        }

        chunks_stored = store_document(doc_id, text, metadata)

        return DocumentResponse(
            doc_id=doc_id,
            chunks_stored=chunks_stored,
            status="success",
            message=f"Successfully processed '{file.filename}' — {chunks_stored} sections indexed."
        )
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


from fastapi.responses import StreamingResponse
import json

@router.post("/query")
async def query_document(request: DocumentQueryRequest):
    try:
        context_chunks = retrieve_context(request.query, request.top_k)
        if not context_chunks:
            def empty_generator():
                metadata = {
                    "type": "metadata",
                    "sources": [],
                    "doc_id": request.doc_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                yield f"data: {json.dumps(metadata)}\n\n"
                err_text = "I couldn't find relevant information in the document for that question. Try rephrasing or ask something else."
                yield f"data: {json.dumps({'type': 'chunk', 'text': err_text})}\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(empty_generator(), media_type="text/event-stream")

        def sse_generator():
            metadata = {
                "type": "metadata",
                "sources": context_chunks[:3],
                "doc_id": request.doc_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            
            stream = generate_with_context(request.query, context_chunks, history=request.history)
            for chunk in stream:
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            
            yield "data: [DONE]\n\n"

        return StreamingResponse(sse_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
