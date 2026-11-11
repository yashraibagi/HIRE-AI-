"""
matcher.py
Matches a parsed resume against a job description: TF-IDF cosine similarity,
skill overlap, and a weighted composite score (skills 50% / experience 30% /
education 20%).
"""

import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from parser import extract_skills, extract_experience_years, extract_education

# ---------------------------------------------------------------------------
# Experience & education scoring helpers
# ---------------------------------------------------------------------------

# Rough seniority cues we look for in a JD to estimate required years,
# used only when the JD doesn't state an explicit number of years.
_JD_EXPERIENCE_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)\s*(?:of)?\s*experience", re.IGNORECASE
)

_DEGREE_RANK = {
    None: 0,
    "Diploma": 1,
    "Associate's": 1,
    "BCA": 2,
    "B.S.": 2,
    "B.Tech": 2,
    "Bachelor's": 2,
    "MCA": 3,
    "M.S.": 3,
    "M.Tech": 3,
    "Master's": 3,
    "MBA": 3,
    "PhD": 4,
}


def _required_experience_years(jd_text: str) -> float:
    match = _JD_EXPERIENCE_PATTERN.search(jd_text or "")
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return 2.0  # sensible default when JD doesn't specify


def _experience_score(resume_years: float, jd_text: str) -> float:
    """0-1 score: 1.0 if resume meets/exceeds the JD's required years."""
    required = _required_experience_years(jd_text)
    if required <= 0:
        return 1.0
    ratio = resume_years / required
    return max(0.0, min(1.0, ratio))


def _education_score(resume_education: dict, jd_text: str) -> float:
    """0-1 score comparing resume's degree rank against what the JD implies."""
    resume_rank = _DEGREE_RANK.get(resume_education.get("degree"), 0)

    jd_lower = (jd_text or "").lower()
    if "phd" in jd_lower or "ph.d" in jd_lower:
        required_rank = 4
    elif "master" in jd_lower or "m.tech" in jd_lower or "mba" in jd_lower:
        required_rank = 3
    elif "bachelor" in jd_lower or "b.tech" in jd_lower or "degree" in jd_lower:
        required_rank = 2
    else:
        required_rank = 1  # most JDs at least imply some formal education

    if required_rank <= 0:
        return 1.0
    return max(0.0, min(1.0, resume_rank / required_rank))


# ---------------------------------------------------------------------------
# TF-IDF similarity
# ---------------------------------------------------------------------------

def vectorize_and_similarity(resume_text: str, jd_text: str) -> float:
    """Return cosine similarity (0-1) between resume and JD via TF-IDF."""
    resume_text = resume_text or ""
    jd_text = jd_text or ""
    if not resume_text.strip() or not jd_text.strip():
        return 0.0

    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    try:
        tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
    except ValueError:
        # Happens if both docs are empty after stopword removal.
        return 0.0

    sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    return float(max(0.0, min(1.0, sim)))


def get_matched_skills(resume_skills: list, jd_skills: list) -> list:
    resume_set = {s.lower(): s for s in resume_skills}
    matched = [resume_set[s.lower()] for s in jd_skills if s.lower() in resume_set]
    return sorted(set(matched))


def get_missing_skills(resume_skills: list, jd_skills: list) -> list:
    resume_lower = {s.lower() for s in resume_skills}
    missing = [s for s in jd_skills if s.lower() not in resume_lower]
    return sorted(set(missing))


def match(resume_data: dict, jd_text: str) -> dict:
    """
    Build the full match report between a parsed resume (as returned by
    parser.parse_resume) and a job description string.
    """
    resume_text = resume_data.get("text", "")
    resume_skills = resume_data.get("skills", []) or extract_skills(resume_text)
    resume_years = resume_data.get("experience_years", extract_experience_years(resume_text))
    resume_education = resume_data.get("education", extract_education(resume_text))

    jd_skills = extract_skills(jd_text)

    print("\n===== JOB DESCRIPTION DEBUG =====")
    print("JOB DESCRIPTION:", jd_text)
    print("EXTRACTED JOB SKILLS:", jd_skills)
    print("================================")

    matched_skills = get_matched_skills(resume_skills, jd_skills)
    missing_skills = get_missing_skills(resume_skills, jd_skills)

    skill_ratio = (len(matched_skills) / len(jd_skills)) if jd_skills else 1.0
    exp_ratio = _experience_score(resume_years, jd_text)
    edu_ratio = _education_score(resume_education, jd_text)

    weighted = (skill_ratio * 0.5) + (exp_ratio * 0.3) + (edu_ratio * 0.2)
    similarity = vectorize_and_similarity(resume_text, jd_text)

    # Final match percent blends the weighted structural score with raw
    # textual similarity so wording/context also has some influence.
    match_percent = round(((weighted * 0.8) + (similarity * 0.2)) * 100, 1)
    match_percent = max(0.0, min(100.0, match_percent))

    return {
        "match_percent": match_percent,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "jd_skills": jd_skills,
        "resume_skills": resume_skills,
        "similarity": round(similarity * 100, 1),
        "skill_score": round(skill_ratio * 100, 1),
        "experience_score": round(exp_ratio * 100, 1),
        "education_score": round(edu_ratio * 100, 1),
    }