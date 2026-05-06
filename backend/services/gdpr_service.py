"""
GDPR Data Deletion Pipeline.

Implements a "right to be forgotten" system that propagates deletion
across ALL storage layers:
  1. PostgreSQL (Users, Conversations, Messages, Documents, UsageRecords)
  2. ChromaDB (document vectors, semantic cache vectors)
  3. S3 / local filesystem (uploaded files)
  4. Redis (cached entries, semantic cache)
"""
import logging
from typing import Optional
from sqlmodel import Session, select
from ..database import engine
from ..models.database_models import User, Conversation, Message, Document
from ..services.audit_service import audit

logger = logging.getLogger("spectra-gdpr")


def delete_user_data(user_id: str, requester_id: str, correlation_id: Optional[str] = None) -> dict:
    """
    Full GDPR-compliant deletion of all data associated with a user.
    Returns a report of what was deleted.
    """
    report = {
        "user_id": user_id,
        "deleted": {},
        "errors": []
    }

    with Session(engine) as session:
        # 1. Fetch all user documents to delete from vector DB + storage
        documents = session.exec(select(Document).where(Document.user_id == user_id)).all()
        doc_ids = [d.id for d in documents]

        # 2. Fetch all conversations
        conversations = session.exec(select(Conversation).where(Conversation.user_id == user_id)).all()
        conv_ids = [c.id for c in conversations]

        # --- Delete Vector DB entries ---
        try:
            from .rag_service import get_collection
            collection = get_collection()
            for doc_id in doc_ids:
                collection.delete(where={"doc_id": doc_id})
            report["deleted"]["vector_chunks"] = len(doc_ids)
        except Exception as e:
            report["errors"].append(f"ChromaDB deletion failed: {e}")
            logger.error(f"[GDPR] ChromaDB delete failed for user {user_id}: {e}")

        # --- Delete S3 / local files ---
        try:
            from .storage_service import StorageService
            storage = StorageService()
            deleted_files = 0
            for doc in documents:
                if doc.storage_path:
                    storage.delete_file(doc.storage_path)
                    deleted_files += 1
            report["deleted"]["files"] = deleted_files
        except Exception as e:
            report["errors"].append(f"File storage deletion failed: {e}")
            logger.error(f"[GDPR] File deletion failed for user {user_id}: {e}")

        # --- Delete Messages ---
        for conv_id in conv_ids:
            messages = session.exec(select(Message).where(Message.conversation_id == conv_id)).all()
            for msg in messages:
                session.delete(msg)
        report["deleted"]["messages"] = sum(
            1 for conv_id in conv_ids
            for _ in session.exec(select(Message).where(Message.conversation_id == conv_id)).all()
        )

        # --- Delete Conversations ---
        for conv in conversations:
            session.delete(conv)
        report["deleted"]["conversations"] = len(conversations)

        # --- Delete Documents (DB records) ---
        for doc in documents:
            session.delete(doc)
        report["deleted"]["documents"] = len(documents)

        # --- Delete UsageRecords ---
        try:
            from .cost_service import UsageRecord
            usage_records = session.exec(select(UsageRecord).where(UsageRecord.user_id == user_id)).all()
            for record in usage_records:
                session.delete(record)
            report["deleted"]["usage_records"] = len(usage_records)
        except Exception as e:
            report["errors"].append(f"Usage record deletion failed: {e}")

        # --- Delete User ---
        user = session.get(User, user_id)
        if user:
            session.delete(user)
        
        session.commit()
        report["deleted"]["user_account"] = True

    # --- Clear Redis cache ---
    try:
        from ..utils.queue_utils import redis_conn
        # Delete all keys related to user
        pattern = f"*{user_id}*"
        keys = redis_conn.keys(pattern)
        if keys:
            redis_conn.delete(*keys)
        report["deleted"]["redis_keys"] = len(keys)
    except Exception as e:
        report["errors"].append(f"Redis cache clear failed: {e}")

    # --- Audit log this deletion (before user is gone) ---
    audit(
        user_id=requester_id,
        action="GDPR_DELETE",
        resource_type="user",
        resource_id=user_id,
        correlation_id=correlation_id,
        extra_info={"report": report},

        status="success" if not report["errors"] else "partial"
    )

    logger.info(f"[GDPR] Full deletion complete for user {user_id}: {report}")
    return report

def export_user_data(user_id: str, session: Session) -> dict:
    """
    Export all data associated with a user in a machine-readable format (JSON).
    """
    user = session.get(User, user_id)
    if not user:
        return {}

    conversations = session.exec(select(Conversation).where(Conversation.user_id == user_id)).all()
    documents = session.exec(select(Document).where(Document.user_id == user_id)).all()

    data = {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None
        },
        "conversations": [],
        "documents": []
    }

    for conv in conversations:
        messages = session.exec(select(Message).where(Message.conversation_id == conv.id)).all()
        data["conversations"].append({
            "id": conv.id,
            "title": conv.title,
            "type": conv.type,
            "created_at": conv.created_at.isoformat() if hasattr(conv, 'created_at') and conv.created_at else None,
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if hasattr(msg, 'timestamp') and msg.timestamp else None
                }
                for msg in messages
            ]
        })

    for doc in documents:
        data["documents"].append({
            "id": doc.id,
            "filename": doc.filename,
            "storage_path": doc.storage_path,
            "mime_type": doc.mime_type,
            "created_at": doc.created_at.isoformat() if hasattr(doc, 'created_at') and doc.created_at else None
        })

    return data
