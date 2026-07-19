"""
main.py

The FastAPI entrypoint. Run it with:
    uvicorn app.main:app --reload --port 8080
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import chat, voice

app = FastAPI(title="Companion API", version="0.4.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(voice.router)


@app.get("/health")
def health():
    return {"status": "ok"}
