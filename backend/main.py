from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from .database import init_db
from .routes import questions, scoring, progress, exam, audio

app = FastAPI(title="PTE Academic Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()

# Mount routes
app.include_router(questions.router, prefix="/api")
app.include_router(scoring.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(exam.router, prefix="/api")
app.include_router(audio.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
