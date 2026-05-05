from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Literal

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: Optional[str] = None
    history: Optional[List[dict]] = []

class DocumentUploadRequest(BaseModel):
    doc_id: str
    filename: str

class DocumentQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    doc_id: str
    top_k: int = Field(5, ge=1, le=10)
    history: Optional[List[dict]] = []

class YouTubeRequest(BaseModel):
    url: str
    summary_length: Literal["short", "medium", "long"] = "medium"

class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    timestamp: str

class DocumentResponse(BaseModel):
    doc_id: str
    chunks_stored: int
    status: str
    message: str

class YouTubeResponse(BaseModel):
    video_id: str
    transcript_length: int
    summary: str
    key_points: List[str]
