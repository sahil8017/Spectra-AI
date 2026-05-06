import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Check if ID already exists (e.g. from Load Balancer)
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        
        # Store in request state
        request.state.correlation_id = correlation_id
        
        response = await call_next(request)
        
        # Attach to response headers
        response.headers["X-Correlation-ID"] = correlation_id
        return response
