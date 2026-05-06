from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from ..database import get_session, engine
from sqlmodel import Session as SQLSession
from ..models.database_models import User, Document
from ..models.schemas import DocumentQueryRequest, DocumentResponse
from ..services.auth_service import get_current_user
from ..services.document_service import extract_pdf_text
from ..services.rag_service import store_document, retrieve_context
from ..services.llm_service import generate_with_context
import uuid
import json
from datetime import datetime, timezone

router = APIRouter(prefix="", tags=["Document"])

from ..utils.queue_utils import enqueue_task

def process_and_index_document(doc_id: str, content: bytes, metadata: dict, session_factory):
    try:
        text = extract_pdf_text(content)
        if not text or not text.strip():
            with session_factory() as session:
                doc = session.get(Document, doc_id)
                if doc:
                    doc.status = "failed"
                    session.add(doc)
                    session.commit()
            return

        chunks_stored = store_document(doc_id, text, metadata)
        
        with session_factory() as session:
            doc = session.get(Document, doc_id)
            if doc:
                doc.status = "indexed"
                doc.chunks = chunks_stored
                session.add(doc)
                session.commit()
    except Exception:
        with session_factory() as session:
            doc = session.get(Document, doc_id)
            if doc:
                doc.status = "failed"
                session.add(doc)
                session.commit()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Create document record
    doc_record = Document(
        user_id=current_user.id,
        filename=file.filename,
        status="processing"
    )
    session.add(doc_record)
    session.commit()
    session.refresh(doc_record)

    try:
        raw = await file.read()
        content = bytes(raw)
        
        def get_bg_session():
            return SQLSession(engine)

        metadata = {
            "filename": file.filename,
            "user_id": current_user.id,
            "doc_id": doc_record.id,
            "upload_time": datetime.now(timezone.utc).isoformat()
        }

        # Durable enqueue
        enqueue_task(process_and_index_document, doc_record.id, content, metadata, get_bg_session)

        return DocumentResponse(
            doc_id=doc_record.id,
            chunks_stored=0,
            status="processing",
            message=f"File '{file.filename}' enqueued for durable processing."
        )
    except Exception as e:
        doc_record.status = "failed"
        session.add(doc_record)
        session.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query")
async def query_document(
    request: DocumentQueryRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify document ownership
    doc = session.get(Document, request.doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Retrieve only for this user/doc
        context_chunks = retrieve_context(request.query, request.top_k, filter_metadata={"doc_id": request.doc_id})
        
        async def sse_generator():
            metadata = {
                "type": "metadata",
                "sources": context_chunks[:3],
                "doc_id": request.doc_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            
            # Note: history might need to be passed if the frontend provides it
            stream = generate_with_context(request.query, context_chunks, history=request.history)
            for chunk in stream:
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            
            yield "data: [DONE]\n\n"

        return StreamingResponse(sse_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{doc_id}")
def get_document_status(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    doc = session.get(Document, doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "doc_id": doc.id,
        "status": doc.status,
        "chunks": doc.chunks,
        "filename": doc.filename
    }

@router.get("/list")
def list_documents(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    statement = select(Document).where(Document.user_id == current_user.id).order_by(Document.created_at.desc())
    return session.exec(statement).all()
