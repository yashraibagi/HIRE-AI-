from pathlib import Path
import os
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile


UPLOAD_ROOT = Path(os.getenv("UPLOAD_DIR", Path(__file__).resolve().parent / "uploads"))
RESUME_DIR = UPLOAD_ROOT / "resumes"
MAX_RESUME_BYTES = 10 * 1024 * 1024


def save_resume_bytes(file_bytes: bytes) -> str:
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded resume file is empty.")
    if len(file_bytes) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail="Resume PDF must be 10 MB or smaller.")
    if not file_bytes.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF.")

    RESUME_DIR.mkdir(parents=True, exist_ok=True)
    resume_id = uuid4().hex
    (RESUME_DIR / f"{resume_id}.pdf").write_bytes(file_bytes)
    return resume_id


async def save_upload(upload: UploadFile) -> tuple[str, bytes]:
    if not (upload.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Resume file must be a PDF.")
    file_bytes = await upload.read(MAX_RESUME_BYTES + 1)
    return save_resume_bytes(file_bytes), file_bytes


def get_resume_path(resume_id: str) -> Path:
    try:
        safe_id = UUID(hex=resume_id).hex
    except ValueError:
        raise HTTPException(status_code=404, detail="Resume not found.")

    path = RESUME_DIR / f"{safe_id}.pdf"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Resume not found.")
    return path
