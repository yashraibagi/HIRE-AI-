from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[str] = mapped_column(String(320), index=True, default="")
    role: Mapped[str] = mapped_column(String(20), default="student")
    profile_resume_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    profile_resume_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_resume_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    profile_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    profile_avatar_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_logo_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    jobs: Mapped[list["Job"]] = relationship(back_populates="recruiter")
    applications: Mapped[list["Application"]] = relationship(back_populates="student")
    mock_interviews: Mapped[list["MockInterviewSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recruiter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    department: Mapped[str] = mapped_column(String(120), default="")
    location: Mapped[str] = mapped_column(String(200), default="")
    job_type: Mapped[str] = mapped_column(String(80), default="Full-time")
    description: Mapped[str] = mapped_column(String)
    required_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    experience_level: Mapped[str] = mapped_column(String(80), default="Entry level")
    minimum_threshold_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    recruiter: Mapped[User] = relationship(back_populates="jobs")
    applications: Mapped[list["Application"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("job_id", "student_id", name="uq_application_job_student"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    resume_file_url: Mapped[str] = mapped_column(String(500))
    resume_name: Mapped[str] = mapped_column(String(255), default="resume.pdf")
    match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ats_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    scoring_error: Mapped[str] = mapped_column(String(500), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    threshold_notified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    shortlisted_notified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    matched_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    missing_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(40), default="Applied", index=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    job: Mapped[Job] = relationship(back_populates="applications")
    student: Mapped[User] = relationship(back_populates="applications")


class MockInterviewSession(Base):
    __tablename__ = "mock_interview_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_role: Mapped[str] = mapped_column(String(120))
    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    user: Mapped[User] = relationship(back_populates="mock_interviews")
    messages: Mapped[list["MockInterviewMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="MockInterviewMessage.question_number"
    )


class MockInterviewMessage(Base):
    __tablename__ = "mock_interview_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"), index=True
    )
    question_number: Mapped[int] = mapped_column(Integer)
    question_text: Mapped[str] = mapped_column(Text)
    user_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_feedback: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped[MockInterviewSession] = relationship(back_populates="messages")
