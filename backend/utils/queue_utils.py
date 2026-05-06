import os
import logging
import threading
from ..config import settings

logger = logging.getLogger("spectra-queue")

# Initialize Redis connection at module level but with safety
redis_conn = None
queue = None

try:
    from redis import Redis
    from rq import Queue
    REDIS_URL = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
    # socket_connect_timeout prevents long hangs during startup if Redis is down
    redis_conn = Redis.from_url(REDIS_URL, socket_connect_timeout=2)
    redis_conn.ping()  # Test connection
    queue = Queue('spectra_tasks', connection=redis_conn)
    logger.info("RQ queue initialized successfully")
except Exception as e:
    logger.warning(f"Redis unavailable ({e}), background tasks will use thread fallback")
    # Keep redis_conn and queue as None (or could use a proxy if needed)

def enqueue_task(func, *args, **kwargs):
    """
    Enqueues a task for background processing.
    Falls back to a daemon thread if Redis/RQ is unavailable.
    """
    if queue is not None:
        try:
            job = queue.enqueue(
                func,
                args=args,
                kwargs=kwargs,
                retry=3,
                result_ttl=3600
            )
            logger.info(f"Enqueued task {func.__name__} (Job ID: {job.get_id()})")
            return job
        except Exception as e:
            logger.warning(f"Failed to enqueue {func.__name__} to RQ: {e}. Falling back to thread.")

    # Fallback: run in a daemon thread
    logger.info(f"Running {func.__name__} in background thread (fallback mode)")
    t = threading.Thread(target=func, args=args, kwargs=kwargs, daemon=True)
    t.start()
    return t
