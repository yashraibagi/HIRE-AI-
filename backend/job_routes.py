import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, joinedload

from analysis_service import analyze_resume_bytes
from database import get_db
from db_models import Application, Job, User
from email_service import (
    ShortlistEmail,
    email_is_configured,
    send_candidate_email,
    send_shortlist_email,
)
from resume_store import get_resume_path, save_upload
from schemas import (
    ApplicationOut,
    ApplicationStatusUpdate,
    BatchEvaluationResult,
    CandidateEmailRequest,
    CandidateEmailResponse,
    EvaluationScore,
    JobCreate,
    JobOut,
    JobUpdate,
    ShortlistResponse,
    UserOut,
)

router = APIRouter(prefix="/api")
logger = logging.getLogger("hireai.jobs")
ALLOWED_ROLES = {"student", "recruiter"}
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "hire-ai-7f6f3")
RECRUITER_EMAILS = {
    email.strip().lower()
    for email in os.getenv("RECRUITER_EMAILS", "").split(",")
    if email.strip()
}


def current_user(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
    x_user_name: str = Header(default=""),
    x_user_role: str = Header(default="student"),
) -> User:
    """Verify Firebase identity and resolve it into a local user row."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in before using this endpoint.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = id_token.verify_firebase_token(
            token,
            GoogleAuthRequest(),
            audience=FIREBASE_PROJECT_ID,
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase sign-in token.") from exc
    user_id = claims.get("user_id") or claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Firebase token does not contain a user ID.")

    requested_role = x_user_role.strip().lower()
    if requested_role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Role must be student or recruiter.")

    user = db.get(User, user_id)
    if user is None:
        user = User(
            id=user_id,
            name=x_user_name.strip()[:200],
            email=str(claims.get("email") or "")[:320],
            role=requested_role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if user.role != requested_role:
            raise HTTPException(status_code=403, detail=f"This account is registered as {user.role}.")
        user.name = x_user_name.strip()[:200] or user.name
        user.email = str(claims.get("email") or user.email)[:320]
        db.commit()
    return user


def require_role(user: User, role: str) -> None:
    if user.role != role:
        raise HTTPException(status_code=403, detail=f"Only {role}s can use this endpoint.")
    if role == "recruiter" and user.email.lower() not in RECRUITER_EMAILS:
        raise HTTPException(
            status_code=403,
            detail="Recruiter access is not approved for this account. Ask an administrator to add your email to RECRUITER_EMAILS.",
        )


def job_output(job: Job, applicant_count: int = 0, shortlisted_count: int = 0) -> dict:
    return {
        "id": job.id,
        "recruiter_id": job.recruiter_id,
        "recruiter_name": job.recruiter.name or job.recruiter.email or "Recruiting team",
        "title": job.title,
        "department": job.department,
        "location": job.location,
        "job_type": job.job_type,
        "description": job.description,
        "required_skills": job.required_skills or [],
        "experience_level": job.experience_level,
        "minimum_threshold_score": job.minimum_threshold_score,
        "created_at": job.created_at,
        "is_active": job.is_active,
        "applicant_count": applicant_count,
        "shortlisted_count": shortlisted_count,
    }


def application_output(
    application: Application,
    job_title: Optional[str] = None,
    mask_pii: bool = False,
) -> dict:
    mask_candidate = mask_pii and application.status != "Shortlisted"
    return {
        "id": application.id,
        "job_id": application.job_id,
        "student_id": "" if mask_candidate else application.student_id,
        "student_name": "Candidate" if mask_candidate else application.student.name or application.student.email or "Candidate",
        "student_email": "" if mask_candidate else application.student.email,
        "resume_file_url": "" if mask_candidate else application.resume_file_url,
        "resume_name": "Resume" if mask_candidate else application.resume_name,
        "match_score": application.match_score,
        "ats_score": application.ats_score,
        "matched_skills": application.matched_skills or [],
        "missing_skills": application.missing_skills or [],
        "scoring_error": application.scoring_error,
        "summary": application.summary or "",
        "status": application.status,
        "applied_at": application.applied_at,
        "job_title": job_title or application.job.title,
    }


def job_description_for(job: Job) -> str:
    skills = ", ".join(job.required_skills or [])
    return f"{job.description}\n\nRequired skills: {skills}"


def store_analysis(application: Application, file_bytes: bytes, job: Job) -> dict:
    result = analyze_resume_bytes(file_bytes, job_description_for(job))
    application.match_score = result["match_score"]
    application.ats_score = result["ats_score"]
    application.matched_skills = result["matched_skills"]
    application.missing_skills = [
        item if isinstance(item, str) else item.get("skill", "")
        for item in result["missing_skills"]
    ]
    application.scoring_error = ""
    application.summary = result["summary"]
    return {
        "match_score": application.match_score,
        "matched_skills": application.matched_skills,
        "missing_skills": application.missing_skills,
        "summary": application.summary,
    }


def notification_for(application: Application, status_text: str) -> ShortlistEmail:
    custom_message = None
    if status_text.startswith("Shortlisted"):
        template = (application.job.recruiter.preferences or {}).get("shortlist_email_template", "").strip()
        if template:
            replacements = {
                "{candidate_name}": application.student.name or "there",
                "{role}": application.job.title,
                "{recruiter_name}": application.job.recruiter.name or application.job.recruiter.email or "Recruiting team",
                "{match_score}": f"{application.match_score:.1f}%" if application.match_score is not None else "Not available",
            }
            custom_message = template
            for placeholder, value in replacements.items():
                custom_message = custom_message.replace(placeholder, value)
    return ShortlistEmail(
        student_name=application.student.name or "there",
        student_email=application.student.email,
        job_title=application.job.title,
        recruiter_name=application.job.recruiter.name or application.job.recruiter.email or "Recruiting team",
        match_score=application.match_score,
        status_text=status_text,
        custom_message=custom_message,
    )


def queue_new_applicant_email(application: Application, background_tasks: BackgroundTasks) -> bool:
    recruiter = application.job.recruiter
    preferences = recruiter.preferences or {}
    if (
        not preferences.get("email_new_applicant_alerts", True)
        or not email_is_configured()
        or not recruiter.email
    ):
        return False
    subject = f"New applicant for {application.job.title}"
    applicant_name = "A candidate" if preferences.get("blind_screening") else application.student.name or "A candidate"
    body = (
        f"Hi {recruiter.name or 'Recruiting team'},\n\n"
        f"{applicant_name} applied for {application.job.title}.\n"
        f"Application status: {application.status}.\n\n"
        "Sign in to HireAI to review the application and resume."
    )
    background_tasks.add_task(send_candidate_email, recruiter.email, subject, body)
    return True


def queue_shortlist_email(
    application: Application,
    background_tasks: BackgroundTasks,
) -> bool:
    if (
        application.shortlisted_notified_at is not None
        or not email_is_configured()
        or not (application.student.preferences or {}).get("email_shortlist_updates", True)
    ):
        return False
    if not application.student.email:
        return False
    application.shortlisted_notified_at = datetime.now(timezone.utc)
    background_tasks.add_task(
        send_shortlist_email,
        notification_for(application, "Shortlisted — next steps are coming soon"),
    )
    return True


def queue_threshold_email(
    application: Application,
    background_tasks: BackgroundTasks,
) -> bool:
    threshold = application.job.minimum_threshold_score
    if (
        threshold is None
        or application.match_score is None
        or application.match_score < threshold
        or application.threshold_notified_at is not None
        or not email_is_configured()
        or not application.student.email
    ):
        return False
    application.threshold_notified_at = datetime.now(timezone.utc)
    background_tasks.add_task(
        send_shortlist_email,
        notification_for(application, "Your resume met the job's match threshold"),
    )
    return True


@router.get("/users/me", response_model=UserOut)
def get_me(user: User = Depends(current_user)) -> User:
    return user


@router.post("/users/me/profile-resume", response_model=UserOut)
async def save_profile_resume(
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> User:
    require_role(user, "student")
    resume_id, _ = await save_upload(resume)
    user.profile_resume_url = f"/api/resumes/{resume_id}"
    user.profile_resume_name = resume.filename or "resume.pdf"
    user.profile_resume_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.post("/jobs", response_model=JobOut, status_code=201)
def create_job(
    values: JobCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> dict:
    require_role(user, "recruiter")
    job_values = values.model_dump()
    if job_values["minimum_threshold_score"] is None:
        job_values["minimum_threshold_score"] = (user.preferences or {}).get("default_ats_threshold")
    job = Job(recruiter_id=user.id, **job_values)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_output(job)


@router.patch("/jobs/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    values: JobUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> dict:
    require_role(user, "recruiter")
    job = db.scalar(
        select(Job).options(joinedload(Job.recruiter)).where(Job.id == job_id)
    )
    if job is None or job.recruiter_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found.")

    for field, value in values.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job_output(job)


@router.get("/jobs", response_model=list[JobOut])
def list_open_jobs(db: Session = Depends(get_db)) -> list[dict]:
    jobs = db.scalars(
        select(Job)
        .options(joinedload(Job.recruiter))
        .where(Job.is_active.is_(True))
        .order_by(Job.created_at.desc())
    ).all()
    return [job_output(job) for job in jobs]


@router.get("/jobs/mine", response_model=list[JobOut])
def list_my_jobs(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[dict]:
    require_role(user, "recruiter")
    jobs = db.scalars(
        select(Job)
        .options(joinedload(Job.recruiter))
        .where(Job.recruiter_id == user.id)
        .order_by(Job.created_at.desc())
    ).all()
    if not jobs:
        return []

    job_ids = [job.id for job in jobs]
    counts = db.execute(
        select(
            Application.job_id,
            func.count(Application.id).label("applicant_count"),
            func.sum(case((Application.status == "Shortlisted", 1), else_=0)).label("shortlisted_count"),
        )
        .where(Application.job_id.in_(job_ids))
        .group_by(Application.job_id)
    ).all()

    count_map = {
        row.job_id: {
            "applicant_count": int(row.applicant_count or 0),
            "shortlisted_count": int(row.shortlisted_count or 0),
        }
        for row in counts
    }

    return [
        job_output(
            job,
            applicant_count=count_map.get(job.id, {}).get("applicant_count", 0),
            shortlisted_count=count_map.get(job.id, {}).get("shortlisted_count", 0),
        )
        for job in jobs
    ]


@router.post("/jobs/{job_id}/apply", response_model=ApplicationOut, status_code=201)
async def apply_to_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    resume: Optional[UploadFile] = File(default=None),
    use_profile_resume: bool = Form(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> dict:
    require_role(user, "student")
    job = db.scalar(select(Job).options(joinedload(Job.recruiter)).where(Job.id == job_id))
    if job is None or not job.is_active:
        raise HTTPException(status_code=404, detail="This job is not open for applications.")
    existing = db.scalar(
        select(Application).where(
            Application.job_id == job.id,
            Application.student_id == user.id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job.")

    if resume is not None and resume.filename:
        resume_id, file_bytes = await save_upload(resume)
        resume_name = resume.filename
        resume_url = f"/api/resumes/{resume_id}"
    elif use_profile_resume and user.profile_resume_url:
        resume_url = user.profile_resume_url
        resume_name = user.profile_resume_name or "resume.pdf"
        resume_id = resume_url.rsplit("/", 1)[-1]
        resume_path = get_resume_path(resume_id)
        file_bytes = resume_path.read_bytes()
    else:
        raise HTTPException(status_code=400, detail="Choose your saved profile resume or upload a PDF.")

    application = Application(
        job_id=job.id,
        student_id=user.id,
        resume_file_url=resume_url,
        resume_name=resume_name,
        status="Applied",
    )
    try:
        store_analysis(application, file_bytes, job)
    except Exception as exc:
        application.scoring_error = str(exc)[:500]
    db.add(application)
    db.flush()
    threshold_email_queued = queue_threshold_email(application, background_tasks)
    queue_new_applicant_email(application, background_tasks)
    db.commit()
    db.refresh(application)
    if threshold_email_queued:
        logger.info("Queued match-threshold email for application %s", application.id)
    return application_output(application)


@router.get("/applications/mine", response_model=list[ApplicationOut])
def list_my_applications(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[dict]:
    require_role(user, "student")
    applications = db.scalars(
        select(Application)
        .options(joinedload(Application.student), joinedload(Application.job))
        .where(Application.student_id == user.id)
        .order_by(Application.applied_at.desc())
    ).all()
    return [application_output(application) for application in applications]


@router.get("/resumes/{resume_id}")
def preview_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> FileResponse:
    resume_url = f"/api/resumes/{resume_id}"
    is_profile_resume = user.profile_resume_url == resume_url
    application = db.scalar(
        select(Application)
        .join(Job, Application.job_id == Job.id)
        .where(
            Application.resume_file_url == resume_url,
            or_(Application.student_id == user.id, Job.recruiter_id == user.id),
        )
        .limit(1)
    )
    if not is_profile_resume and application is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if (
        application is not None
        and application.student_id != user.id
        and (user.preferences or {}).get("blind_screening")
        and application.status != "Shortlisted"
    ):
        raise HTTPException(status_code=404, detail="Resume not found.")
    return FileResponse(
        get_resume_path(resume_id),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"},
    )


@router.get("/jobs/{job_id}/applications", response_model=list[ApplicationOut])
def list_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[dict]:
    require_role(user, "recruiter")
    job = db.get(Job, job_id)
    if job is None or job.recruiter_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found.")
    applications = db.scalars(
        select(Application)
        .options(joinedload(Application.student), joinedload(Application.job))
        .where(Application.job_id == job_id)
        .order_by(Application.match_score.desc().nullslast(), Application.applied_at.desc())
    ).all()
    mask_pii = bool((user.preferences or {}).get("blind_screening"))
    return [application_output(application, mask_pii=mask_pii) for application in applications]


@router.get("/applications/recruiter", response_model=list[ApplicationOut])
def list_recruiter_applications(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[dict]:
    require_role(user, "recruiter")
    applications = db.scalars(
        select(Application)
        .join(Job, Application.job_id == Job.id)
        .options(joinedload(Application.student), joinedload(Application.job))
        .where(Job.recruiter_id == user.id)
        .order_by(Application.applied_at.desc())
    ).all()
    mask_pii = bool((user.preferences or {}).get("blind_screening"))
    return [application_output(application, mask_pii=mask_pii) for application in applications]


@router.post("/jobs/{job_id}/evaluate", response_model=BatchEvaluationResult)
def evaluate_pending_applications(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> BatchEvaluationResult:
    require_role(user, "recruiter")
    job = db.get(Job, job_id)
    if job is None or job.recruiter_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found.")
    pending = db.scalars(
        select(Application)
        .options(joinedload(Application.student), joinedload(Application.job))
        .where(Application.job_id == job_id, Application.match_score.is_(None))
    ).all()
    evaluated = 0
    failed = 0
    emails_queued = 0
    results: list[EvaluationScore] = []
    for application in pending:
        try:
            resume_id = application.resume_file_url.rsplit("/", 1)[-1]
            score = store_analysis(application, get_resume_path(resume_id).read_bytes(), job)
            if queue_threshold_email(application, background_tasks):
                emails_queued += 1
            evaluated += 1
            results.append(EvaluationScore(application_id=application.id, **score))
        except Exception as exc:
            application.scoring_error = str(exc)[:500]
            failed += 1
    db.commit()
    return BatchEvaluationResult(
        evaluated=evaluated,
        failed=failed,
        results=results,
        emails_queued=emails_queued,
    )


@router.post(
    "/applications/{application_id}/shortlist",
    response_model=ShortlistResponse,
)
def shortlist_application(
    application_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> ShortlistResponse:
    require_role(user, "recruiter")
    application = db.scalar(
        select(Application)
        .options(joinedload(Application.student), joinedload(Application.job).joinedload(Job.recruiter))
        .where(Application.id == application_id)
    )
    if application is None or application.job.recruiter_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found.")

    application.status = "Shortlisted"
    email_queued = queue_shortlist_email(application, background_tasks)
    db.commit()
    message = (
        "Applicant shortlisted and notification queued."
        if email_queued
        else "Applicant shortlisted. Email is not configured or a notification was already queued."
    )
    return ShortlistResponse(
        application_id=application.id,
        status="Shortlisted",
        email_queued=email_queued,
        message=message,
    )


@router.post(
    "/applications/{application_id}/email",
    response_model=CandidateEmailResponse,
)
async def email_candidate(
    application_id: int,
    values: CandidateEmailRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> CandidateEmailResponse:
    require_role(user, "recruiter")
    application = db.scalar(
        select(Application)
        .options(joinedload(Application.student), joinedload(Application.job))
        .where(Application.id == application_id)
    )
    if application is None or application.job.recruiter_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found.")
    if application.status != "Shortlisted":
        raise HTTPException(status_code=409, detail="Only shortlisted candidates can be emailed from this action.")
    if not email_is_configured():
        raise HTTPException(status_code=503, detail="Email delivery is not configured. Set the SMTP environment variables and try again.")
    if not application.student.email:
        raise HTTPException(status_code=400, detail="This candidate does not have an email address.")

    sent = await send_candidate_email(
        application.student.email,
        values.subject.strip(),
        values.body.strip(),
    )
    if not sent:
        raise HTTPException(status_code=502, detail="The email could not be delivered. Check the SMTP configuration and try again.")
    return CandidateEmailResponse(message=f"Email sent to {application.student.email}.")


@router.patch("/applications/{application_id}/status", response_model=ApplicationOut)
def update_application_status(
    application_id: int,
    values: ApplicationStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> dict:
    require_role(user, "recruiter")
    application = db.scalar(
        select(Application)
        .options(
            joinedload(Application.student),
            joinedload(Application.job).joinedload(Job.recruiter),
        )
        .where(Application.id == application_id)
    )
    if application is None or application.job.recruiter_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found.")
    application.status = values.status
    if values.status == "Shortlisted":
        queue_shortlist_email(application, background_tasks)
    db.commit()
    db.refresh(application)
    return application_output(
        application,
        mask_pii=bool((user.preferences or {}).get("blind_screening")),
    )
