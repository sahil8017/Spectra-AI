"""
Cost & Token Tracking Service.

Tracks token usage and estimated cost per request per user.
Model pricing (approximate, as of 2025):
  - Gemini 1.5 Flash: $0.075 / 1M input tokens, $0.30 / 1M output tokens
  - Gemini 1.5 Pro:   $3.50  / 1M input tokens, $10.50 / 1M output tokens
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Session, select
from ..database import engine

logger = logging.getLogger("spectra-cost")

# Model pricing in USD per 1M tokens
MODEL_PRICING = {
    "spectra-flash": {"input": 0.075, "output": 0.30},
    "spectra-pro":   {"input": 3.50,  "output": 10.50},
    "default":       {"input": 0.075, "output": 0.30},
}

# Per-plan token budgets per day
PLAN_DAILY_TOKEN_BUDGET = {
    "user":  100_000,   # Free tier: 100K tokens/day
    "pro":   1_000_000, # Pro tier: 1M tokens/day
    "admin": 10_000_000 # Admin: 10M tokens/day
}


class UsageRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    conversation_id: Optional[str] = None
    model_id: str
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    endpoint: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def calculate_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    pricing = MODEL_PRICING.get(model_id, MODEL_PRICING["default"])
    cost = (input_tokens / 1_000_000) * pricing["input"]
    cost += (output_tokens / 1_000_000) * pricing["output"]
    return round(cost, 8)


def record_usage(
    user_id: str,
    model_id: str,
    input_tokens: int,
    output_tokens: int,
    endpoint: str = "",
    conversation_id: Optional[str] = None
) -> UsageRecord:
    cost = calculate_cost(model_id, input_tokens, output_tokens)
    record = UsageRecord(
        user_id=user_id,
        conversation_id=conversation_id,
        model_id=model_id,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        estimated_cost_usd=cost,
        endpoint=endpoint
    )
    with Session(engine) as session:
        session.add(record)
        session.commit()
    logger.info(f"Usage: user={user_id} model={model_id} tokens={input_tokens}+{output_tokens} cost=${cost:.6f}")
    return record


def get_user_daily_tokens(user_id: str) -> int:
    """Returns total tokens used by user today."""
    from sqlalchemy import func
    today = datetime.now(timezone.utc).date()
    with Session(engine) as session:
        result = session.exec(
            select(
                func.sum(UsageRecord.input_tokens + UsageRecord.output_tokens)
            ).where(
                UsageRecord.user_id == user_id,
                func.date(UsageRecord.timestamp) == today
            )
        ).first()
    return result or 0


def check_quota(user_id: str, user_role: str, estimated_tokens: int = 1000) -> bool:
    """Returns True if user is within their daily token budget."""
    budget = PLAN_DAILY_TOKEN_BUDGET.get(user_role, PLAN_DAILY_TOKEN_BUDGET["user"])
    used = get_user_daily_tokens(user_id)
    if used + estimated_tokens > budget:
        logger.warning(f"Quota exceeded: user={user_id} role={user_role} used={used}/{budget}")
        return False
    return True


def get_user_usage_summary(user_id: str) -> dict:
    with Session(engine) as session:
        records = session.exec(
            select(UsageRecord).where(UsageRecord.user_id == user_id)
        ).all()
    total_tokens = sum(r.input_tokens + r.output_tokens for r in records)
    total_cost = sum(r.estimated_cost_usd for r in records)
    return {
        "total_requests": len(records),
        "total_tokens": total_tokens,
        "total_cost_usd": round(total_cost, 6),
        "today_tokens": get_user_daily_tokens(user_id)
    }
