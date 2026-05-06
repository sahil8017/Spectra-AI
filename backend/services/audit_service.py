"""
Audit Logging Service.

Records sensitive user actions (login, upload, delete, data export)
to a persistent audit trail for compliance and security monitoring.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Session, select
from ..database import engine

logger = logging.getLogger("spectra-audit")


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    action: str = Field(index=True)      # e.g. "LOGIN", "UPLOAD", "DELETE_DOCUMENT"
    resource_type: Optional[str] = None  # e.g. "document", "conversation"
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    correlation_id: Optional[str] = None
    extra_info: Optional[str] = None     # JSON string for extra context
    status: str = "success"              # "success" | "failure"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def audit(
    user_id: str,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    correlation_id: Optional[str] = None,
    extra_info: Optional[dict] = None,
    status: str = "success"
):
    """
    Records a structured audit event.
    """
    import json
    record = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
        extra_info=json.dumps(extra_info) if extra_info else None,
        status=status
    )

    try:
        with Session(engine) as session:
            session.add(record)
            session.commit()
        logger.info(f"[AUDIT] user={user_id} action={action} resource={resource_type}/{resource_id} status={status}")
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")


def get_audit_logs(user_id: Optional[str] = None, action: Optional[str] = None, limit: int = 100):
    """Retrieves audit logs with optional filters."""
    with Session(engine) as session:
        query = select(AuditLog)
        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        if action:
            query = query.where(AuditLog.action == action)
        query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
        return session.exec(query).all()
