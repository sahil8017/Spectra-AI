"""
Dead Letter Queue (DLQ) — Captures permanently failed RQ jobs.

Failed jobs are written to:
  1. Redis sorted set `spectra:dlq` (for fast inspection)
  2. PostgreSQL DLQRecord table (for durable audit trail)

Worker monitors the failed_job_registry and moves them here.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Session, select
from ..database import engine
from ..utils.queue_utils import redis_conn

logger = logging.getLogger("spectra-dlq")

DLQ_REDIS_KEY = "spectra:dlq"


class DLQRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: str = Field(index=True)
    job_func: str
    job_args: str = ""       # JSON-serialized
    error_message: str = ""
    failure_count: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved: bool = False


def push_to_dlq(job_id: str, job_func: str, args: list, error: str, failure_count: int = 1):
    """Pushes a permanently failed job to the DLQ (Redis + DB)."""
    record = {
        "job_id": job_id,
        "job_func": job_func,
        "error": error,
        "failure_count": failure_count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    # Redis DLQ (score = timestamp for ordering)
    try:
        score = datetime.now(timezone.utc).timestamp()
        redis_conn.zadd(DLQ_REDIS_KEY, {json.dumps(record): score})
    except Exception as e:
        logger.error(f"Failed to push to Redis DLQ: {e}")

    # Persistent DB record
    try:
        db_record = DLQRecord(
            job_id=job_id,
            job_func=job_func,
            job_args=json.dumps(args),
            error_message=error,
            failure_count=failure_count
        )
        with Session(engine) as session:
            session.add(db_record)
            session.commit()
    except Exception as e:
        logger.error(f"Failed to write DLQ record to DB: {e}")

    logger.error(f"[DLQ] Job {job_id} ({job_func}) permanently failed: {error}")


def get_dlq_records(limit: int = 50) -> List[DLQRecord]:
    """Retrieves unresolved DLQ records for admin review."""
    with Session(engine) as session:
        return session.exec(
            select(DLQRecord)
            .where(DLQRecord.resolved == False)
            .order_by(DLQRecord.created_at.desc())
            .limit(limit)
        ).all()


def resolve_dlq_record(job_id: str) -> bool:
    """Marks a DLQ record as resolved (admin action)."""
    with Session(engine) as session:
        record = session.exec(select(DLQRecord).where(DLQRecord.job_id == job_id)).first()
        if record:
            record.resolved = True
            session.add(record)
            session.commit()
            logger.info(f"[DLQ] Resolved job {job_id}")
            return True
    return False


def sweep_rq_failed_jobs():
    """
    Sweeps RQ's failed job registry and migrates entries to the DLQ.
    Call this periodically (e.g., every 5 minutes via a scheduled job).
    """
    from rq import Queue
    from rq.job import Job
    from rq.registry import FailedJobRegistry

    q = Queue("spectra_tasks", connection=redis_conn)
    registry = FailedJobRegistry(queue=q)

    for job_id in registry.get_job_ids():
        try:
            job = Job.fetch(job_id, connection=redis_conn)
            exc_info = job.exc_info or "Unknown error"
            push_to_dlq(
                job_id=job_id,
                job_func=str(job.func_name),
                args=list(job.args or []),
                error=str(exc_info)[:1000],
            )
            registry.remove(job, delete_job=True)
        except Exception as e:
            logger.error(f"[DLQ Sweep] Could not process job {job_id}: {e}")
