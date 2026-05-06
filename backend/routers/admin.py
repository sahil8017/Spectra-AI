"""
Admin API Router.

Protected endpoints (admin-only) for:
- DLQ inspection and resolution
- Usage analytics per user
- Audit log browsing
- System health + queue depth
- GDPR data deletion
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from ..services.auth_service import require_role
from ..models.database_models import User

router = APIRouter(prefix="/admin", tags=["Admin"])
admin_required = require_role(["admin"])


# ─── DLQ ────────────────────────────────────────────────────────
@router.get("/dlq")
def list_dlq_records(
    limit: int = 50,
    admin: User = Depends(admin_required)
):
    """Returns unresolved Dead Letter Queue records."""
    from ..services.dlq_service import get_dlq_records
    records = get_dlq_records(limit=limit)
    return {"total": len(records), "records": records}


@router.post("/dlq/{job_id}/resolve")
def resolve_dlq(job_id: str, admin: User = Depends(admin_required)):
    from ..services.dlq_service import resolve_dlq_record
    success = resolve_dlq_record(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found in DLQ")
    return {"status": "resolved", "job_id": job_id}


@router.post("/dlq/sweep")
def sweep_failed_jobs(admin: User = Depends(admin_required)):
    """Manually trigger DLQ sweep of RQ failed job registry."""
    from ..services.dlq_service import sweep_rq_failed_jobs
    sweep_rq_failed_jobs()
    return {"status": "sweep_complete"}


# ─── Usage Analytics ────────────────────────────────────────────
@router.get("/usage/{user_id}")
def get_user_usage(user_id: str, admin: User = Depends(admin_required)):
    from ..services.cost_service import get_user_usage_summary
    return get_user_usage_summary(user_id)


@router.get("/usage")
def list_all_usage(admin: User = Depends(admin_required)):
    """Top-level usage summary across all users."""
    from sqlmodel import Session, select, func
    from ..database import engine
    from ..services.cost_service import UsageRecord
    
    with Session(engine) as session:
        rows = session.exec(
            select(
                UsageRecord.user_id,
                func.sum(UsageRecord.input_tokens + UsageRecord.output_tokens).label("total_tokens"),
                func.sum(UsageRecord.estimated_cost_usd).label("total_cost"),
                func.count(UsageRecord.id).label("request_count")
            ).group_by(UsageRecord.user_id)
        ).all()
    
    return [
        {"user_id": r[0], "total_tokens": r[1], "total_cost_usd": round(r[2], 6), "requests": r[3]}
        for r in rows
    ]


# ─── Audit Logs ─────────────────────────────────────────────────
@router.get("/audit")
def get_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    admin: User = Depends(admin_required)
):
    from ..services.audit_service import get_audit_logs
    logs = get_audit_logs(user_id=user_id, action=action, limit=limit)
    return {"total": len(logs), "logs": logs}


# ─── Queue Health ────────────────────────────────────────────────
@router.get("/queue/health")
def queue_health(admin: User = Depends(admin_required)):
    """Returns current queue depth and worker status."""
    try:
        from ..utils.queue_utils import redis_conn, queue
        from rq import Queue
        from rq.registry import FailedJobRegistry, StartedJobRegistry
        
        q = Queue("spectra_tasks", connection=redis_conn)
        failed_registry = FailedJobRegistry(queue=q)
        started_registry = StartedJobRegistry(queue=q)
        
        return {
            "queue_depth": len(q),
            "failed_jobs": len(failed_registry),
            "active_jobs": len(started_registry),
            "workers": len(q.job_ids),
        }
    except Exception as e:
        return {"error": str(e)}


# ─── GDPR Deletion ──────────────────────────────────────────────
@router.delete("/users/{user_id}/data")
def gdpr_delete_user(user_id: str, admin: User = Depends(admin_required)):
    """GDPR-compliant full data deletion for a user."""
    from ..services.gdpr_service import delete_user_data
    report = delete_user_data(
        user_id=user_id,
        requester_id=admin.id,
    )
    return report
