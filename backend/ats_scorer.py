"""
ats_scorer.py
Computes an Applicant Tracking System (ATS) style score out of 100, built
from four weighted components:
  - keyword_score          -> up to 30 pts
  - skill_coverage_score    -> up to 40 pts
  - section_completeness    -> up to 20 pts
  - format_quality          -> up to 10 pts
"""

import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def keyword_score(resume_text: str, jd_text: str) -> float:
    """
    Up to 30 pts based on how many important JD keywords (TF-IDF top terms)
    appear in the resume.
    """
    resume_text = (resume_text or "").strip()
    jd_text = (jd_text or "").strip()
    if not resume_text or not jd_text:
        return 0.0

    vectorizer = TfidfVectorizer(stop_words="english", max_features=40)
    try:
        vectorizer.fit([jd_text])
    except ValueError:
        return 0.0

    jd_keywords = vectorizer.get_feature_names_out()
    if len(jd_keywords) == 0:
        return 0.0

    resume_lower = resume_text.lower()
    hits = sum(1 for kw in jd_keywords if kw.lower() in resume_lower)
    ratio = hits / len(jd_keywords)
    return round(ratio * 30, 1)


def skill_coverage_score(matched: list, total: int) -> float:
    """Up to 40 pts based on the fraction of required JD skills present."""
    if not total:
        return 40.0  # no explicit skills required -> full marks
    ratio = min(1.0, len(matched) / total)
    return round(ratio * 40, 1)


_SECTION_PATTERNS = {
    "contact": re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),  # email as contact proxy
    "summary": re.compile(r"\b(summary|objective|profile)\b", re.IGNORECASE),
    "experience": re.compile(r"\b(experience|employment|work history)\b", re.IGNORECASE),
    "education": re.compile(r"\b(education|academic|qualification)\b", re.IGNORECASE),
    "skills": re.compile(r"\b(skills|technical skills|competencies)\b", re.IGNORECASE),
    "projects": re.compile(r"\b(projects?|portfolio)\b", re.IGNORECASE),
}


def section_completeness(resume_text: str) -> float:
    """Up to 20 pts based on presence of standard resume sections."""
    text = resume_text or ""
    present = sum(1 for pattern in _SECTION_PATTERNS.values() if pattern.search(text))
    total_sections = len(_SECTION_PATTERNS)
    ratio = present / total_sections
    return round(ratio * 20, 1)


_PHONE_PATTERN = re.compile(r"(\+?\d[\d\-\s()]{8,}\d)")
_BULLET_PATTERN = re.compile(r"^[\s]*[•\-\*\u2022]", re.MULTILINE)


def format_quality(resume_text: str) -> float:
    """
    Up to 10 pts for structural quality signals: reasonable length,
    presence of bullet points, and a phone number alongside the email.
    """
    text = resume_text or ""
    score = 0.0
    word_count = len(text.split())

    # Reasonable length (not empty, not absurdly short or bloated).
    if 150 <= word_count <= 1200:
        score += 4.0
    elif word_count > 0:
        score += 2.0

    # Uses bullet points for readability / ATS parsing friendliness.
    if _BULLET_PATTERN.search(text):
        score += 3.0

    # Has a phone number in addition to (presumably) an email.
    if _PHONE_PATTERN.search(text):
        score += 2.0

    # Avoids excessive special-character noise (common in poorly converted PDFs).
    noise_ratio = len(re.findall(r"[^\w\s.,@()+/-]", text)) / max(1, len(text))
    if noise_ratio < 0.02:
        score += 1.0

    return round(min(score, 10.0), 1)


def _grade_for(score: float) -> str:
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 50:
        return "C"
    if score >= 30:
        return "D"
    return "F"


def calculate_ats(resume_text: str, jd_text: str, skills: dict) -> dict:
    """
    skills: {"matched": [...], "total": int}  (total = number of JD-required skills)
    Returns {"score": float, "grade": str, "feedback": [str, ...]}
    """
    matched = skills.get("matched", [])
    total = skills.get("total", 0)

    kw_score = keyword_score(resume_text, jd_text)
    cov_score = skill_coverage_score(matched, total)
    section_score = section_completeness(resume_text)
    fmt_score = format_quality(resume_text)

    total_score = round(kw_score + cov_score + section_score + fmt_score, 1)
    total_score = max(0.0, min(100.0, total_score))
    grade = _grade_for(total_score)

    feedback = []
    if kw_score < 18:
        feedback.append("Add more keywords from the job description throughout your resume.")
    if cov_score < 24:
        feedback.append("Your resume is missing several skills the job description asks for.")
    if section_score < 14:
        feedback.append("Include clearly labeled sections: Summary, Experience, Education, Skills, Projects.")
    if fmt_score < 6:
        feedback.append("Improve formatting: use bullet points and include a phone number and email.")
    if not feedback:
        feedback.append("Strong resume overall — well-aligned with this job description.")

    return {
        "score": total_score,
        "grade": grade,
        "components": {
            "keyword_score": kw_score,
            "skill_coverage_score": cov_score,
            "section_completeness": section_score,
            "format_quality": fmt_score,
        },
        "feedback": feedback,
    }