import os
import tempfile
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, document, youtube
from config import settings

# Fix Windows Errno 22: force a clean ASCII temp directory for pdfminer/pdfplumber
_SAFE_TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tmp")
os.makedirs(_SAFE_TMP, exist_ok=True)
tempfile.tempdir = _SAFE_TMP

app = FastAPI(title="Spectra AI — GenAI PDF QA & YouTube Summarizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(document.router, prefix="/api/document", tags=["document"])
app.include_router(youtube.router, prefix="/api/youtube", tags=["youtube"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "tmp_dir": _SAFE_TMP}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
