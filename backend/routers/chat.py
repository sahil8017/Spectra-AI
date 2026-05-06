"""
Chat Router — Production-Grade with Full Service Integration.

Features:
- Semantic cache lookup (instant response for similar queries)
- Per-user token quota enforcement (plan-based)
- Backpressure via asyncio Semaphore
- LLM fallback chain via reliability_service (circuit breaker + retry)
- Token usage + cost tracking per request
- Audit logging for all chat activity
- Structured SSE streaming with correlation ID
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from asyncio import Semaphore
import json
import uuid
from datetime import datetime

from ..database import get_session
from ..models.database_models import User, Conversation, Message
from ..models.schemas import ChatRequest
from ..services.auth_service import get_current_user
from ..services.llm_service import generate_response
from ..services.reliability_service import llm_with_fallback, gemini_breaker
from ..services.cost_service import record_usage, check_quota
from ..services.audit_service import audit
from ..services.cache_service import cache_service
from ..utils.security import sanitize_text, validate_prompt
from ..utils.limiter import limiter

router = APIRouter(prefix="/chat", tags=["Chat"])

# Backpressure: max 10 concurrent AI generations
ai_semaphore = Semaphore(10)


# ─── Main Chat Endpoint ──────────────────────────────────────────
@router.post("")
@limiter.limit("20/minute")
async def chat_endpoint(
    request: Request,
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    ip = request.client.host if request.client else "unknown"

    # 1. Sanitize & validate input
    clean_message = sanitize_text(chat_request.message)
    if not clean_message:
        raise HTTPException(status_code=400, detail="Invalid or empty message content")
    if not validate_prompt(clean_message):
        audit(user_id=current_user.id, action="PROMPT_INJECTION_BLOCKED",
              ip_address=ip, correlation_id=correlation_id, status="failure")
        raise HTTPException(status_code=400, detail="Message flagged by security filter")

    # 2. Check user token quota
    if not check_quota(current_user.id, current_user.role, estimated_tokens=500):
        raise HTTPException(
            status_code=429,
            detail=f"Daily token quota exceeded for your '{current_user.role}' plan. Upgrade for more capacity."
        )

    # 3. Check semantic cache
    cached_response = cache_service.get_semantic(clean_message)
    if cached_response:
        async def cached_stream():
            yield f"data: {json.dumps({'conversation_id': chat_request.conversation_id or 'cached', 'cached': True})}\n\n"
            yield f"data: {json.dumps({'text': cached_response})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(cached_stream(), media_type="text/event-stream")

    # 4. Conversation context
    if chat_request.conversation_id:
        conversation = session.get(Conversation, chat_request.conversation_id)
        if not conversation or conversation.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        title = clean_message[:40] + "..." if len(clean_message) > 40 else clean_message
        conversation = Conversation(user_id=current_user.id, title=title)
        session.add(conversation)
        session.commit()
        session.refresh(conversation)

    # 5. Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=clean_message
    )
    session.add(user_msg)
    session.commit()

    # 6. Build history (last 10 messages)
    history_objs = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.timestamp.desc())
        .limit(10)
    ).all()
    history = [
        {"role": "user" if m.role == "user" else "model", "parts": [m.content]}
        for m in reversed(history_objs[1:])
    ]

    # 7. Streaming SSE generator
    async def sse_generator():
        full_response = ""
        input_tokens = len(clean_message.split()) * 2  # rough estimate

        # Acquire semaphore inside generator (async context)
        async with ai_semaphore:
            yield f"data: {json.dumps({'conversation_id': conversation.id, 'correlation_id': correlation_id})}\n\n"
            try:
                # LLM with circuit breaker + fallback
                def primary_llm():
                    return generate_response(clean_message, history=history, stream=True)

                stream = llm_with_fallback(primary_fn=primary_llm, stream=True)

                for chunk in stream:
                    full_response += chunk
                    yield f"data: {json.dumps({'text': chunk})}\n\n"

            except Exception as e:
                full_response = "I'm temporarily unavailable. Please try again shortly."
                yield f"data: {json.dumps({'text': full_response, 'degraded': True})}\n\n"

        # 8. Persist AI message
        output_tokens = len(full_response.split()) * 2  # rough estimate
        ai_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=full_response,
            model_used=chat_request.model_id or "spectra-flash"
        )
        session.add(ai_msg)
        conversation.updated_at = datetime.utcnow()
        session.add(conversation)
        session.commit()

        # 9. Record usage + cost
        record_usage(
            user_id=current_user.id,
            model_id=chat_request.model_id or "spectra-flash",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            endpoint="/chat",
            conversation_id=conversation.id
        )

        # 10. Store in semantic cache
        if len(full_response) > 20 and "unavailable" not in full_response:
            cache_service.set_semantic(clean_message, full_response)

        # 11. Audit
        audit(
            user_id=current_user.id,
            action="CHAT",
            resource_type="conversation",
            resource_id=conversation.id,
            ip_address=ip,
            correlation_id=correlation_id
        )

        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


# ─── Conversation History ────────────────────────────────────────
@router.get("/history")
def get_chat_history(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    statement = select(Conversation).where(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc())
    return session.exec(statement).all()


@router.get("/history/{conversation_id}")
def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    conversation = session.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.timestamp.asc())
    ).all()
    return messages


@router.delete("/history/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    conversation = session.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = session.exec(
        select(Message).where(Message.conversation_id == conversation_id)
    ).all()
    for m in messages:
        session.delete(m)
    session.delete(conversation)
    session.commit()

    audit(
        user_id=current_user.id,
        action="DELETE_CONVERSATION",
        resource_type="conversation",
        resource_id=conversation_id,
        ip_address=request.client.host if request.client else "unknown",
        correlation_id=getattr(request.state, "correlation_id", None)
    )
    return {"status": "deleted"}


# ─── Usage Endpoint (self-service) ──────────────────────────────
@router.get("/usage")
def get_my_usage(current_user: User = Depends(get_current_user)):
    from ..services.cost_service import get_user_usage_summary, PLAN_DAILY_TOKEN_BUDGET
    summary = get_user_usage_summary(current_user.id)
    summary["plan"] = current_user.role
    summary["daily_budget"] = PLAN_DAILY_TOKEN_BUDGET.get(current_user.role, 100_000)
    return summary
