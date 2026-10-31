import json
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from db_models import MockInterviewMessage, MockInterviewSession, User
from interview_simulator import InterviewModelError, evaluate_answer, generate_question
from job_routes import current_user, require_role
from schemas import (
    InterviewCategoryCount,
    InterviewFlashcard,
    MockInterviewMessageOut,
    MockInterviewStartRequest,
    MockInterviewStartResponse,
    MockInterviewSubmitRequest,
    MockInterviewSubmitResponse,
    MockInterviewSummaryResponse,
)

router = APIRouter(prefix="/interview", tags=["interview prep"])
BANK_PATH = Path(__file__).resolve().parent / "data" / "interview_bank.json"


@lru_cache(maxsize=1)
def load_flashcards() -> tuple[InterviewFlashcard, ...]:
    """Load and validate the static flashcard bank once per process."""
    try:
        with BANK_PATH.open(encoding="utf-8") as bank_file:
            records = json.load(bank_file)
        return tuple(InterviewFlashcard.model_validate(record) for record in records)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail="Interview question bank is unavailable or invalid.") from exc


@router.get("/flashcards", response_model=list[InterviewFlashcard])
def get_flashcards(
    category: Optional[str] = Query(default=None, min_length=1),
    sub_category: Optional[str] = Query(default=None, min_length=1),
    difficulty: Optional[Literal["Easy", "Medium", "Hard"]] = None,
    search: Optional[str] = Query(default=None, min_length=1, description="Search questions, topics, and answers"),
) -> list[InterviewFlashcard]:
    """Return flashcards, optionally filtered by category, difficulty, or search text."""
    cards = load_flashcards()
    normalized_category = category.casefold().strip() if category else None
    normalized_sub_category = sub_category.casefold().strip() if sub_category else None
    normalized_search = search.casefold().strip() if search else None

    filtered = []
    for card in cards:
        if normalized_category and card.category.casefold() != normalized_category:
            continue
        if normalized_sub_category and card.sub_category.casefold() != normalized_sub_category:
            continue
        if difficulty and card.difficulty != difficulty:
            continue
        if normalized_search:
            searchable_text = " ".join((
                card.category,
                card.sub_category,
                card.topic,
                card.question,
                card.summary_answer,
                card.detailed_answer,
                *card.key_takeaways,
            )).casefold()
            if normalized_search not in searchable_text:
                continue
        filtered.append(card)
    return filtered


@router.get("/categories", response_model=list[InterviewCategoryCount])
def get_interview_categories() -> list[InterviewCategoryCount]:
    """Return available categories, subcategories, and their flashcard counts."""
    counts: dict[str, dict[str, int]] = {}
    for card in load_flashcards():
        subcategory_counts = counts.setdefault(card.category, {})
        subcategory_counts[card.sub_category] = subcategory_counts.get(card.sub_category, 0) + 1

    return [
        InterviewCategoryCount(
            category=category,
            question_count=sum(subcategories.values()),
            sub_categories=[
                {"sub_category": subcategory, "question_count": count}
                for subcategory, count in sorted(subcategories.items())
            ],
        )
        for category, subcategories in sorted(counts.items())
    ]


TOTAL_MOCK_QUESTIONS = 5


def _require_student(user: User) -> None:
    require_role(user, "student")


@router.post("/mock/start", response_model=MockInterviewStartResponse, status_code=201)
def start_mock_interview(
    values: MockInterviewStartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> MockInterviewStartResponse:
    _require_student(user)
    target_role = values.target_role.strip()
    try:
        first_question = generate_question(target_role, 1, [])
    except InterviewModelError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    interview = MockInterviewSession(id=str(uuid4()), user_id=user.id, target_role=target_role)
    interview.messages.append(
        MockInterviewMessage(question_number=1, question_text=first_question)
    )
    db.add(interview)
    db.commit()
    return MockInterviewStartResponse(
        session_id=interview.id,
        target_role=interview.target_role,
        question_number=1,
        total_questions=TOTAL_MOCK_QUESTIONS,
        question=first_question,
        status="in_progress",
    )


@router.post("/mock/submit-answer", response_model=MockInterviewSubmitResponse)
def submit_mock_interview_answer(
    values: MockInterviewSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> MockInterviewSubmitResponse:
    _require_student(user)
    answer = values.user_answer.strip()
    if not answer:
        raise HTTPException(status_code=422, detail="Answer cannot be blank.")

    interview = db.scalar(
        select(MockInterviewSession)
        .options(selectinload(MockInterviewSession.messages))
        .where(MockInterviewSession.id == values.session_id, MockInterviewSession.user_id == user.id)
    )
    if interview is None:
        raise HTTPException(status_code=404, detail="Mock interview session not found.")
    if interview.status != "in_progress":
        raise HTTPException(status_code=409, detail="This mock interview is already complete.")

    current_message = next(
        (message for message in interview.messages if message.user_answer is None), None
    )
    if current_message is None:
        raise HTTPException(status_code=409, detail="No unanswered question is available.")

    prior_questions = [message.question_text for message in interview.messages]
    try:
        feedback = evaluate_answer(interview.target_role, current_message.question_text, answer)
        next_question = None
        if current_message.question_number < TOTAL_MOCK_QUESTIONS:
            next_question = generate_question(
                interview.target_role,
                current_message.question_number + 1,
                prior_questions,
            )
    except InterviewModelError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    current_message.user_answer = answer
    current_message.ai_feedback = feedback.model_dump()
    current_message.score = float(feedback.score)
    is_complete = current_message.question_number >= TOTAL_MOCK_QUESTIONS
    if is_complete:
        scores = [message.score for message in interview.messages if message.score is not None]
        interview.overall_score = round(sum(scores) / len(scores), 1) if scores else None
        interview.status = "completed"
    else:
        interview.messages.append(
            MockInterviewMessage(
                question_number=current_message.question_number + 1,
                question_text=next_question,
            )
        )

    db.commit()
    return MockInterviewSubmitResponse(
        session_id=interview.id,
        question_number=current_message.question_number,
        total_questions=TOTAL_MOCK_QUESTIONS,
        evaluated_question=current_message.question_text,
        user_answer=answer,
        feedback=feedback,
        next_question=next_question,
        next_question_number=None if is_complete else current_message.question_number + 1,
        status="completed" if is_complete else "in_progress",
    )


@router.get("/mock/summary/{session_id}", response_model=MockInterviewSummaryResponse)
def get_mock_interview_summary(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> MockInterviewSummaryResponse:
    _require_student(user)
    interview = db.scalar(
        select(MockInterviewSession)
        .options(selectinload(MockInterviewSession.messages))
        .where(MockInterviewSession.id == session_id, MockInterviewSession.user_id == user.id)
    )
    if interview is None:
        raise HTTPException(status_code=404, detail="Mock interview session not found.")

    scored_messages = [message for message in interview.messages if message.score is not None]
    average = interview.overall_score
    if average is None and scored_messages:
        average = round(sum(message.score for message in scored_messages) / len(scored_messages), 1)
    if average is None:
        badge = "Not yet rated"
        recommendations = ["Answer the interview questions to receive your performance report."]
    elif average >= 8:
        badge = "Strong performance"
        recommendations = [
            "Keep practicing with new examples so your answers stay concise and specific.",
            "Continue explaining the reasoning and trade-offs behind your decisions.",
        ]
    elif average >= 6:
        badge = "Developing well"
        recommendations = [
            "Add concrete examples and measurable outcomes to strengthen your answers.",
            "Practice explaining technical decisions in a clear, structured way.",
        ]
    else:
        badge = "Keep practicing"
        recommendations = [
            "Review the ideal answers and revisit the core concepts for your target role.",
            "Use a simple structure: context, approach, result, and what you learned.",
        ]

    return MockInterviewSummaryResponse(
        session_id=interview.id,
        target_role=interview.target_role,
        status=interview.status,
        total_questions=TOTAL_MOCK_QUESTIONS,
        answered_questions=len(scored_messages),
        overall_score=average,
        performance_badge=badge,
        recommendations=recommendations,
        messages=[
            MockInterviewMessageOut(
                question_number=message.question_number,
                question_text=message.question_text,
                user_answer=message.user_answer,
                ai_feedback=message.ai_feedback,
                score=message.score,
            )
            for message in interview.messages
        ],
    )
