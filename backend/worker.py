"""
RQ Worker Entry Point.

Run this in a separate process to consume background jobs from the Redis queue.
It also sweeps the DLQ every 5 minutes via a scheduled check.

Usage:
  python -m backend.worker
  # or
  rq worker spectra_tasks --url redis://localhost:6379/0
"""
import os
import sys
import time
import logging
import threading

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("spectra-worker")


def start_dlq_sweep_thread(interval_seconds: int = 300):
    """Runs DLQ sweep in a background daemon thread every N seconds."""
    def sweep_loop():
        while True:
            try:
                from backend.services.dlq_service import sweep_rq_failed_jobs
                logger.info("[DLQ] Running scheduled sweep...")
                sweep_rq_failed_jobs()
            except Exception as e:
                logger.error(f"[DLQ] Sweep failed: {e}")
            time.sleep(interval_seconds)

    t = threading.Thread(target=sweep_loop, daemon=True)
    t.start()
    logger.info(f"[DLQ] Sweep thread started (every {interval_seconds}s)")


if __name__ == "__main__":
    from rq import Worker
    from backend.utils.queue_utils import redis_conn, queue

    # Initialize DB tables before processing
    from backend.database import init_db
    from sqlmodel import SQLModel
    from backend.database import engine

    init_db()
    from backend.services.cost_service import UsageRecord
    from backend.services.dlq_service import DLQRecord
    from backend.services.audit_service import AuditLog
    SQLModel.metadata.create_all(engine)

    # Start DLQ sweep thread
    start_dlq_sweep_thread(interval_seconds=300)

    logger.info("Starting Spectra RQ Worker on queue: spectra_tasks")
    worker = Worker([queue], connection=redis_conn)
    worker.work(with_scheduler=True)
