"""
LLM Reliability Service: Fallback chain, circuit breaker, and retry logic.

Architecture:
  Primary:   Gemini Flash (fast, cheap)
  Secondary: Gemini Pro (smarter, costlier)
  Tertiary:  Rule-based fallback (always available)
"""
import time
import logging
import functools
from enum import Enum
from typing import Optional, Callable, Iterator
from datetime import datetime, timezone

logger = logging.getLogger("spectra-reliability")


# ─────────────────────────────────────────────
# Circuit Breaker
# ─────────────────────────────────────────────
class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Failing — reject fast
    HALF_OPEN = "half_open" # Testing recovery


class CircuitBreaker:
    def __init__(self, name: str, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = CircuitState.CLOSED

    def call(self, func: Callable, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            elapsed = time.time() - (self.last_failure_time or 0)
            if elapsed >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                logger.info(f"[CB:{self.name}] HALF-OPEN — testing recovery.")
            else:
                raise RuntimeError(f"Circuit '{self.name}' is OPEN. Retry in {int(self.recovery_timeout - elapsed)}s.")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure(e)
            raise

    def _on_success(self):
        if self.state == CircuitState.HALF_OPEN:
            logger.info(f"[CB:{self.name}] Recovery confirmed — CLOSING circuit.")
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self, exc: Exception):
        self.failure_count += 1
        self.last_failure_time = time.time()
        logger.warning(f"[CB:{self.name}] Failure #{self.failure_count}: {exc}")
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(f"[CB:{self.name}] OPENED after {self.failure_count} failures.")


# One breaker per external service
gemini_breaker = CircuitBreaker("gemini", failure_threshold=5, recovery_timeout=60)
redis_breaker = CircuitBreaker("redis", failure_threshold=3, recovery_timeout=30)
db_breaker = CircuitBreaker("database", failure_threshold=5, recovery_timeout=45)


# ─────────────────────────────────────────────
# Exponential Backoff Retry
# ─────────────────────────────────────────────
def retry_with_backoff(func: Callable, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 30.0):
    """
    Executes func with exponential backoff on failure.
    Raises the last exception if all retries are exhausted.
    """
    last_exc = None
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            last_exc = e
            delay = min(base_delay * (2 ** attempt), max_delay)
            logger.warning(f"Retry {attempt + 1}/{max_retries} after {delay:.1f}s — {e}")
            time.sleep(delay)
    raise last_exc


# ─────────────────────────────────────────────
# LLM Fallback Chain
# ─────────────────────────────────────────────
RULE_BASED_RESPONSE = (
    "I'm sorry, I'm temporarily unable to process your request due to service unavailability. "
    "Please try again in a few moments. If this persists, contact support."
)

def llm_with_fallback(primary_fn: Callable, fallback_fn: Optional[Callable] = None, stream: bool = False):
    """
    Attempts primary LLM call via circuit breaker.
    Falls back to secondary, then rule-based response.
    """
    # --- Attempt 1: Primary (Gemini Flash) via circuit breaker + retry
    try:
        def _primary():
            return gemini_breaker.call(primary_fn)
        return retry_with_backoff(_primary, max_retries=2, base_delay=1.0)
    except Exception as e:
        logger.warning(f"Primary LLM failed: {e}. Trying fallback.")

    # --- Attempt 2: Secondary fallback
    if fallback_fn:
        try:
            return retry_with_backoff(fallback_fn, max_retries=1, base_delay=2.0)
        except Exception as e:
            logger.warning(f"Secondary LLM failed: {e}. Using rule-based fallback.")

    # --- Attempt 3: Rule-based fallback (always succeeds)
    logger.error("All LLM options exhausted — returning rule-based response.")
    if stream:
        def _rule_stream() -> Iterator[str]:
            yield RULE_BASED_RESPONSE
        return _rule_stream()
    return RULE_BASED_RESPONSE
