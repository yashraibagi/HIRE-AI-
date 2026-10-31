from pathlib import Path
import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from db_models import User
from job_routes import current_user, require_role
from schemas import UserPreferencesUpdate, UserProfileOut, UserProfileUpdate

router = APIRouter(prefix="/api/user")
UPLOAD_ROOT = Path(os.getenv("UPLOAD_DIR", Path(__file__).resolve().parent / "uploads"))
AVATAR_DIR = UPLOAD_ROOT / "avatars"
MAX_AVATAR_SIZE = 2 * 1024 * 1024
PROFILE_FIELDS = (
    "phone",
    "professional_title",
    "company",
    "company_bio",
    "college",
    "degree",
    "graduation_year",
    "linkedin_url",
    "github_url",
    "portfolio_url",
)


def _authorize_profile(user: User) -> None:
    if user.role == "recruiter":
        require_role(user, "recruiter")


def _profile_output(user: User) -> UserProfileOut:
    profile_data = user.profile_data or {}
    return UserProfileOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        **{field: profile_data.get(field) or "" for field in PROFILE_FIELDS if field != "graduation_year"},
        graduation_year=profile_data.get("graduation_year"),
        profile_resume_url=user.profile_resume_url,
        profile_resume_name=user.profile_resume_name,
        profile_resume_updated_at=user.profile_resume_updated_at,
        profile_avatar_url=f"/api/user/profile/avatar?v={user.profile_avatar_filename}" if user.profile_avatar_filename else None,
        company_logo_url=f"/api/user/profile/company-logo?v={user.company_logo_filename}" if user.company_logo_filename else None,
        preferences=user.preferences or {},
    )


@router.get("/profile", response_model=UserProfileOut)
def get_profile(user: User = Depends(current_user)) -> UserProfileOut:
    _authorize_profile(user)
    return _profile_output(user)


@router.put("/profile", response_model=UserProfileOut)
def update_profile(
    values: UserProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> UserProfileOut:
    _authorize_profile(user)
    changes = values.model_dump(exclude_unset=True)
    name = changes.pop("name", None)
    if name is not None:
        name = name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be blank.")
        user.name = name
    profile_data = dict(user.profile_data or {})
    profile_data.update(changes)
    user.profile_data = profile_data
    db.commit()
    db.refresh(user)
    return _profile_output(user)


@router.patch("/preferences", response_model=UserProfileOut)
def update_preferences(
    values: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> UserProfileOut:
    _authorize_profile(user)
    changes = values.model_dump(exclude_unset=True)
    if user.role == "recruiter":
        allowed_fields = {
            "email_new_applicant_alerts",
            "blind_screening",
            "default_ats_threshold",
            "shortlist_email_template",
        }
    else:
        allowed_fields = {
            "email_shortlist_updates",
            "target_job_roles",
            "preferred_job_types",
            "primary_skills",
        }
    unsupported = set(changes) - allowed_fields
    if unsupported:
        raise HTTPException(
            status_code=422,
            detail=f"These preferences are not available for the {user.role} role: {', '.join(sorted(unsupported))}.",
        )
    preferences = dict(user.preferences or {})
    preferences.update(changes)
    user.preferences = preferences
    db.commit()
    db.refresh(user)
    return _profile_output(user)


@router.post("/profile/avatar", response_model=UserProfileOut)
async def upload_profile_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> UserProfileOut:
    _authorize_profile(user)
    contents = await avatar.read(MAX_AVATAR_SIZE + 1)
    if len(contents) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=413, detail="Profile images must be 2 MB or smaller.")

    signatures = (
        (b"\x89PNG\r\n\x1a\n", ".png", "image/png"),
        (b"\xff\xd8\xff", ".jpg", "image/jpeg"),
    )
    image_type = next((item for item in signatures if contents.startswith(item[0])), None)
    if image_type is None and len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        image_type = (b"RIFF", ".webp", "image/webp")
    if image_type is None:
        raise HTTPException(status_code=400, detail="Upload a valid PNG, JPEG, or WebP image.")

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{image_type[1]}"
    (AVATAR_DIR / filename).write_bytes(contents)
    previous_filename = user.profile_avatar_filename
    user.profile_avatar_filename = filename
    db.commit()
    db.refresh(user)
    if previous_filename:
        (AVATAR_DIR / Path(previous_filename).name).unlink(missing_ok=True)
    return _profile_output(user)


@router.get("/profile/avatar")
def get_profile_avatar(user: User = Depends(current_user)) -> FileResponse:
    _authorize_profile(user)
    filename = user.profile_avatar_filename
    if not filename or Path(filename).name != filename:
        raise HTTPException(status_code=404, detail="Profile image not found.")
    path = AVATAR_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Profile image not found.")
    media_type = {".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}.get(path.suffix)
    return FileResponse(path, media_type=media_type)


@router.post("/profile/company-logo", response_model=UserProfileOut)
async def upload_company_logo(
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> UserProfileOut:
    _authorize_profile(user)
    if user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can upload a company logo.")
    contents = await logo.read(MAX_AVATAR_SIZE + 1)
    if len(contents) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=413, detail="Company logos must be 2 MB or smaller.")
    image_type = next((item for item in (
        (b"\x89PNG\r\n\x1a\n", ".png"),
        (b"\xff\xd8\xff", ".jpg"),
    ) if contents.startswith(item[0])), None)
    if image_type is None and len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        image_type = (b"RIFF", ".webp")
    if image_type is None:
        raise HTTPException(status_code=400, detail="Upload a valid PNG, JPEG, or WebP image.")
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"company-{uuid4().hex}{image_type[1]}"
    (AVATAR_DIR / filename).write_bytes(contents)
    previous_filename = user.company_logo_filename
    user.company_logo_filename = filename
    db.commit()
    db.refresh(user)
    if previous_filename:
        (AVATAR_DIR / Path(previous_filename).name).unlink(missing_ok=True)
    return _profile_output(user)


@router.get("/profile/company-logo")
def get_company_logo(user: User = Depends(current_user)) -> FileResponse:
    _authorize_profile(user)
    if user.role != "recruiter":
        raise HTTPException(status_code=404, detail="Company logo not found.")
    filename = user.company_logo_filename
    if not filename or Path(filename).name != filename:
        raise HTTPException(status_code=404, detail="Company logo not found.")
    path = AVATAR_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Company logo not found.")
    media_type = {".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}.get(path.suffix)
    return FileResponse(path, media_type=media_type)