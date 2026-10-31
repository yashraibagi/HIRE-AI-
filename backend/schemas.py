from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    department: str = Field(default="", max_length=120)
    location: str = Field(default="", max_length=200)
    job_type: str = Field(default="Full-time", max_length=80)
    description: str = Field(min_length=10)
    required_skills: list[str] = Field(default_factory=list)
    experience_level: str = Field(default="Entry level", max_length=80)
    minimum_threshold_score: Optional[float] = Field(default=None, ge=0, le=100)


class JobUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    department: Optional[str] = Field(default=None, max_length=120)
    location: Optional[str] = Field(default=None, max_length=200)
    job_type: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = Field(default=None, min_length=10)
    required_skills: Optional[list[str]] = None
    experience_level: Optional[str] = Field(default=None, max_length=80)
    minimum_threshold_score: Optional[float] = Field(default=None, ge=0, le=100)
    is_active: Optional[bool] = None


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recruiter_id: str
    recruiter_name: str
    title: str
    department: str
    location: str
    job_type: str
    description: str
    required_skills: list[str]
    experience_level: str
    minimum_threshold_score: Optional[float]
    created_at: datetime
    is_active: bool
    applicant_count: int = 0
    shortlisted_count: int = 0


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    student_id: str
    student_name: str
    student_email: str
    resume_file_url: str
    resume_name: str
    match_score: Optional[float]
    ats_score: Optional[float]
    matched_skills: list[str]
    missing_skills: list[str]
    scoring_error: str = ""
    summary: str = ""
    status: str
    applied_at: datetime
    job_title: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: Literal["Applied", "Under Review", "Shortlisted", "Rejected"]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role: str
    profile_resume_url: Optional[str]
    profile_resume_name: Optional[str]


class UserProfileOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: str = ""
    professional_title: str = ""
    company: str = ""
    company_bio: str = ""
    college: str = ""
    degree: str = ""
    graduation_year: Optional[int] = None
    linkedin_url: str = ""
    github_url: str = ""
    portfolio_url: str = ""
    profile_resume_url: Optional[str] = None
    profile_resume_name: Optional[str] = None
    profile_resume_updated_at: Optional[datetime] = None
    profile_avatar_url: Optional[str] = None
    company_logo_url: Optional[str] = None
    preferences: dict = Field(default_factory=dict)


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=40)
    professional_title: Optional[str] = Field(default=None, max_length=120)
    company: Optional[str] = Field(default=None, max_length=160)
    company_bio: Optional[str] = Field(default=None, max_length=2000)
    college: Optional[str] = Field(default=None, max_length=160)
    degree: Optional[str] = Field(default=None, max_length=120)
    graduation_year: Optional[int] = Field(default=None, ge=1950, le=2100)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    github_url: Optional[str] = Field(default=None, max_length=500)
    portfolio_url: Optional[str] = Field(default=None, max_length=500)


class UserPreferencesUpdate(BaseModel):
    email_new_applicant_alerts: Optional[bool] = None
    email_shortlist_updates: Optional[bool] = None
    blind_screening: Optional[bool] = None
    default_ats_threshold: Optional[float] = Field(default=None, ge=0, le=100)
    shortlist_email_template: Optional[str] = Field(default=None, max_length=6000)
    target_job_roles: Optional[list[str]] = None
    preferred_job_types: Optional[list[str]] = None
    primary_skills: Optional[list[str]] = None


class EvaluationScore(BaseModel):
    application_id: int
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    summary: str


class BatchEvaluationResult(BaseModel):
    evaluated: int
    failed: int
    results: list[EvaluationScore]
    emails_queued: int = 0


class ShortlistResponse(BaseModel):
    application_id: int
    status: Literal["Shortlisted"]
    email_queued: bool
    message: str


class CandidateEmailRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10000)


class CandidateEmailResponse(BaseModel):
    message: str


class AptitudeQuestionOut(BaseModel):
    id: str
    category: str
    level: Literal["Beginner", "Intermediate", "Advanced"]
    question: str
    options: list[str]
    correct_answer: str
    explanation: str


class DSAProblemOut(BaseModel):
    id: str
    title: str
    pattern: str
    level: Literal["Beginner", "Intermediate", "Advanced"]
    statement: str
    approach: str
    python_solution: str


class VideoResourceOut(BaseModel):
    id: str
    title: str
    category: str
    topic: str
    level: Literal["Beginner", "Intermediate", "Advanced"]
    url: str
    description: str = ""


class InterviewFlashcard(BaseModel):
    id: str
    category: str
    sub_category: str
    topic: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    question: str
    summary_answer: str
    detailed_answer: str
    key_takeaways: list[str]


class InterviewSubCategoryCount(BaseModel):
    sub_category: str
    question_count: int


class InterviewCategoryCount(BaseModel):
    category: str
    question_count: int
    sub_categories: list[InterviewSubCategoryCount]


class MockInterviewStartRequest(BaseModel):
    target_role: str = Field(min_length=2, max_length=120)


class MockInterviewStartResponse(BaseModel):
    session_id: str
    target_role: str
    question_number: int
    total_questions: int
    question: str
    status: Literal["in_progress"]


class MockInterviewSubmitRequest(BaseModel):
    session_id: str = Field(min_length=36, max_length=36)
    user_answer: str = Field(min_length=1, max_length=6000)


class MockInterviewFeedback(BaseModel):
    score: int = Field(ge=1, le=10)
    strengths: list[str] = Field(min_length=1, max_length=6)
    areas_for_improvement: list[str] = Field(min_length=1, max_length=6)
    ideal_model_answer: str = Field(min_length=1, max_length=5000)


class MockInterviewSubmitResponse(BaseModel):
    session_id: str
    question_number: int
    total_questions: int
    evaluated_question: str
    user_answer: str
    feedback: MockInterviewFeedback
    next_question: Optional[str] = None
    next_question_number: Optional[int] = None
    status: Literal["in_progress", "completed"]


class MockInterviewMessageOut(BaseModel):
    question_number: int
    question_text: str
    user_answer: Optional[str]
    ai_feedback: Optional[MockInterviewFeedback]
    score: Optional[float]


class MockInterviewSummaryResponse(BaseModel):
    session_id: str
    target_role: str
    status: Literal["in_progress", "completed"]
    total_questions: int
    answered_questions: int
    overall_score: Optional[float]
    performance_badge: str
    recommendations: list[str]
    messages: list[MockInterviewMessageOut]
