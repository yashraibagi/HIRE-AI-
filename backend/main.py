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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hireai.main")

pp = FastAPI(
    title="HireAI Backend",
    description="AI Resume Screening & Job Matching API",
    version="1.0.0",
)

default_cors_origins = "https://hireai018.vercel.app,https://hireai-git-main-raibagiyash-1018s-projects.vercel.app,https://hireai-bvgzgos5e-raibagiyash-1018s-projects.vercel.app,http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://localhost:8001"
cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", default_cors_origins).split(",")
    if origin.strip()
]

pp.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
pp.include_router(jobs_router)
pp.include_router(user_router)
pp.include_router(interview_router)
pp.include_router(learning_router)
import time
from fastapi import Request

@pp.middleware("http")
async def measure_request_time(request: Request, call_next):
    start = time.perf_counter()

    response = await call_next(request)

    elapsed = time.perf_counter() - start

    logger.info(
        "%s %s took %.2f seconds",
        request.method,
        request.url.path,
        elapsed,
    )

    return response
@pp.on_event("startup")
def on_startup():
    initialize_database()
    logger.info("HireAI backend started successfully.")  


@pp.get("/health")
def health():
    return {"status": "ok"}


@pp.post("/analyze")
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