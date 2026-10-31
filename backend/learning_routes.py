import json
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query

from schemas import AptitudeQuestionOut, DSAProblemOut, VideoResourceOut

router = APIRouter(prefix="/interview", tags=["learning hub"])
DATA_PATH = Path(__file__).resolve().parent / "data" / "learning_hub.json"


@lru_cache(maxsize=1)
def load_learning_hub() -> dict:
    """Load the static learning hub dataset once per process."""
    try:
        with DATA_PATH.open(encoding="utf-8") as learning_file:
            payload = json.load(learning_file)
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Learning hub dataset is unavailable or invalid.") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=500, detail="Learning hub dataset format is invalid.")

    return payload


@router.get("/aptitude", response_model=list[AptitudeQuestionOut])
def get_aptitude_questions(
    category: Optional[str] = Query(default=None, description="Filter by aptitude category: Quantitative Aptitude, Logical Reasoning, or Verbal Ability"),
    level: Optional[Literal["Beginner", "Intermediate", "Advanced"]] = None,
    search: Optional[str] = Query(default=None, min_length=1, description="Text search over aptitude questions and explanations"),
) -> list[AptitudeQuestionOut]:
    """Return aptitude practice questions with optional category, level, and search filters."""
    data = load_learning_hub().get("aptitude", [])
    results = list(data)

    if category:
        normalized = category.strip().casefold()
        results = [item for item in results if item.get("category", "").casefold() == normalized]

    if level:
        results = [item for item in results if item.get("level") == level]

    if search:
        normalized_search = search.strip().casefold()
        results = [
            item
            for item in results
            if normalized_search in item.get("question", "").casefold()
            or normalized_search in item.get("explanation", "").casefold()
            or normalized_search in item.get("correct_answer", "").casefold()
        ]

    return [AptitudeQuestionOut.model_validate(item) for item in results]


@router.get("/dsa", response_model=list[DSAProblemOut])
def get_dsa_practice(
    level: Optional[Literal["Beginner", "Intermediate", "Advanced"]] = None,
    difficulty: Optional[Literal["Beginner", "Intermediate", "Advanced"]] = None,
    pattern: Optional[str] = Query(default=None, description="Filter by DSA sub-pattern such as Hash Map or Sliding Window"),
    search: Optional[str] = Query(default=None, min_length=1, description="Text search over DSA problem statements and titles"),
) -> list[DSAProblemOut]:
    """Return DSA problems with filters for level, pattern, and text search."""
    data = load_learning_hub().get("dsa", [])
    results = list(data)

    selected_level = level or difficulty
    if selected_level:
        results = [item for item in results if item.get("level") == selected_level]

    if pattern:
        normalized_pattern = pattern.strip().casefold()
        results = [item for item in results if item.get("pattern", "").casefold() == normalized_pattern]

    if search:
        normalized_search = search.strip().casefold()
        results = [
            item
            for item in results
            if normalized_search in item.get("title", "").casefold()
            or normalized_search in item.get("statement", "").casefold()
            or normalized_search in item.get("pattern", "").casefold()
        ]

    return [DSAProblemOut.model_validate(item) for item in results]


@router.get("/videos", response_model=list[VideoResourceOut])
def get_learning_videos(
    topic: Optional[str] = Query(default=None, description="Filter by topic such as DBMS, OS, or Hashing"),
    category: Optional[str] = Query(default=None, description="Filter by lesson category such as DBMS, OS, Computer Networks, or DSA"),
    level: Optional[Literal["Beginner", "Intermediate", "Advanced"]] = None,
) -> list[VideoResourceOut]:
    """Return curated YouTube resources for core CS fundamentals and interview-prep DSA topics."""
    data = load_learning_hub().get("youtube_resources", [])
    results = list(data)

    if topic:
        normalized_topic = topic.strip().casefold()
        results = [item for item in results if item.get("topic", "").casefold() == normalized_topic]

    if category:
        normalized_category = category.strip().casefold()
        results = [item for item in results if item.get("category", "").casefold() == normalized_category]

    if level:
        results = [item for item in results if item.get("level") == level]

    return [VideoResourceOut.model_validate(item) for item in results]
