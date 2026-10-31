"""
main.py
HireAI backend — FastAPI application exposing:
  GET  /health   -> simple liveness check
  POST /analyze  -> full resume-vs-job-description analysis pipeline
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parent / ".env")

from analysis_service import analyze_resume_bytes
from database import initialize_database
import db_models  # noqa: F401 - registers SQLAlchemy models with Base metadata
from interview_routes import router as interview_router
from job_routes import router as jobs_router
from learning_routes import router as learning_router
from user_routes import router as user_router
import role_classifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hireai.main")

app = FastAPI(
    title="HireAI Backend",
    description="AI Resume Screening & Job Matching API",
    version="1.0.0",
)

default_cors_origins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5175,http://127.0.0.1:5175"
cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", default_cors_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(jobs_router)
app.include_router(user_router)
app.include_router(interview_router)
app.include_router(learning_router)


@app.on_event("startup")
def on_startup():
    """Warm up the role classifier (trains once, cached to disk after)."""
    initialize_database()
    logger.info("Starting HireAI backend — training/loading role classifier...")
    role_classifier.train_model()
    logger.info("Role classifier ready.")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Resume file must be a PDF.")

    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="job_description must not be empty.")

    file_bytes = await resume.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded resume file is empty.")

    try:
        return analyze_resume_bytes(file_bytes, job_description)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Resume analysis failed")
        raise HTTPException(status_code=500, detail="Internal server error while analyzing resume")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)