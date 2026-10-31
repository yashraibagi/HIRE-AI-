import json
import os
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from pydantic import ValidationError

from schemas import MockInterviewFeedback


class InterviewModelError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _generate_json(prompt: str) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise InterviewModelError(
            "AI interview is not configured. Set GEMINI_API_KEY in backend/.env and restart the backend.",
            status_code=503,
        )

    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(model, safe='-._')}:generateContent"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.6},
    }
    request = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )

    try:
        with urlopen(request, timeout=45) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        # Do not propagate provider response text; it may include sensitive request details.
        status_code = 503 if exc.code in (401, 403, 429) else 502
        raise InterviewModelError(
            "The AI interview provider could not complete the request. Check the Gemini API key, quota, and model configuration.",
            status_code=status_code,
        ) from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise InterviewModelError("The AI interview provider is temporarily unavailable.", status_code=503) from exc

    try:
        text = response_data["candidates"][0]["content"]["parts"][0]["text"].strip()
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
        result = json.loads(text)
        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object")
        return result
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise InterviewModelError("The AI interview provider returned an invalid response. Please try again.") from exc


def generate_question(target_role: str, question_number: int, prior_questions: list[str]) -> str:
    prior = "\n".join(f"- {question}" for question in prior_questions) or "None yet"
    prompt = f"""You are a professional technical interviewer. Generate exactly one concise, open-ended interview question for a candidate interviewing for the role: {target_role}.
This is question {question_number} of 5. Vary the topic and difficulty naturally; keep it appropriate for the role. Do not include the answer, an introduction, numbering, or markdown. Avoid repeating these prior questions:
{prior}
Return only valid JSON with exactly this shape: {{"question": "..."}}"""
    result = _generate_json(prompt)
    question = result.get("question")
    if not isinstance(question, str) or not question.strip() or len(question) > 1500:
        raise InterviewModelError("The AI interview provider returned an invalid question. Please try again.")
    return question.strip()


def evaluate_answer(target_role: str, question: str, answer: str) -> MockInterviewFeedback:
    prompt = f"""You are a fair, constructive interviewer evaluating a candidate for the role: {target_role}.
Evaluate only the answer to the question; do not infer personal characteristics. Score 1-10 based on technical depth/correctness, clarity, relevance, and useful examples. Be proportionate for the role and seniority implied by the answer. Give specific, actionable feedback and a concise ideal model answer.
Question: {question}
Candidate answer: {answer}
Return only valid JSON with exactly these fields: {{"score": 1, "strengths": ["..."], "areas_for_improvement": ["..."], "ideal_model_answer": "..."}}.
The score must be an integer from 1 to 10. Include 1-4 brief strengths and 1-4 actionable improvement points."""
    result = _generate_json(prompt)
    try:
        return MockInterviewFeedback.model_validate(result)
    except ValidationError as exc:
        raise InterviewModelError("The AI interview provider returned invalid evaluation feedback. Please try again.") from exc
