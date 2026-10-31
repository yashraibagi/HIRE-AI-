"""
parser.py
Resume parsing utilities: PDF text extraction, skill extraction (spaCy NER +
predefined skills list), experience-years extraction, and education extraction.
"""

import io
import re
import logging

from PyPDF2 import PdfReader

logger = logging.getLogger("hireai.parser")

# ---------------------------------------------------------------------------
# spaCy setup (used to help tokenize / recognize ORG-like proper nouns which we
# cross-reference against the skills list, and to lemmatize tokens so that
# "developing" still matches "develop" style skill entries where relevant).
# We degrade gracefully if the model isn't installed so the API keeps working.
# ---------------------------------------------------------------------------
_NLP = None
_MATCHER = None


def _get_nlp():
    global _NLP, _MATCHER
    if _NLP is not None:
        return _NLP
    try:
        import spacy
        from spacy.matcher import PhraseMatcher

        try:
            _NLP = spacy.load("en_core_web_sm")
        except OSError:
            # Model not downloaded in this environment — fall back to a
            # blank English pipeline so tokenization still works.
            logger.warning(
                "spaCy model 'en_core_web_sm' not found; falling back to "
                "blank('en'). Run `python -m spacy download en_core_web_sm` "
                "for full NER support."
            )
            _NLP = spacy.blank("en")

        _MATCHER = PhraseMatcher(_NLP.vocab, attr="LOWER")
        patterns = [_NLP.make_doc(skill) for skill in SKILLS_LIST]
        _MATCHER.add("SKILLS", patterns)
    except Exception as exc:  # pragma: no cover - environment dependent
        logger.warning("spaCy unavailable (%s); using regex-only skill extraction.", exc)
        _NLP = False  # sentinel meaning "no spaCy available"
    return _NLP


# ---------------------------------------------------------------------------
# Predefined technical skills list (120+ entries) covering languages,
# frameworks, databases, cloud/devops, ML/data, and general tools.
# ---------------------------------------------------------------------------
SKILLS_LIST = [
    # Languages
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "C", "Go", "Rust",
    "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Perl", "Dart",
    # Web / Frontend
    "React", "React.js", "Vue.js", "Angular", "Next.js", "Redux", "HTML", "CSS",
    "Tailwind CSS", "Bootstrap", "jQuery", "Webpack", "Sass", "Framer Motion",
    # Backend / Frameworks
    "Node.js", "Express.js", "Django", "Flask", "FastAPI", "Spring Boot",
    "ASP.NET", "Ruby on Rails", "GraphQL", "REST API", "gRPC",
    # Databases
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "SQLite", "Redis", "Cassandra",
    "Oracle", "Firebase", "Firestore", "DynamoDB", "Elasticsearch",
    # Cloud / DevOps
    "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Jenkins",
    "CI/CD", "Terraform", "Ansible", "Linux", "Bash", "Nginx", "Git", "GitHub",
    "GitLab", "CircleCI",
    # Data Science / ML / AI
    "Machine Learning", "Deep Learning", "Natural Language Processing", "NLP",
    "Computer Vision", "TensorFlow", "PyTorch", "Keras", "scikit-learn",
    "Pandas", "NumPy", "Matplotlib", "Seaborn", "OpenCV", "Hugging Face",
    "spaCy", "XGBoost", "LightGBM", "Data Visualization", "Statistics",
    "A/B Testing", "Feature Engineering", "Neural Networks", "MLOps",
    # Data Engineering / BI
    "ETL", "Apache Spark", "Hadoop", "Kafka", "Airflow", "Tableau", "Power BI",
    "Snowflake", "BigQuery", "dbt", "Data Warehousing",
    # Testing / QA
    "Unit Testing", "Pytest", "Jest", "Selenium", "Cypress", "TDD",
    # Mobile
    "Android", "iOS", "Flutter", "React Native", "SwiftUI",
    # Tools / Other
    "Jira", "Confluence", "Agile", "Scrum", "Figma", "Postman", "VS Code",
    "Microservices", "System Design", "OOP", "Data Structures", "Algorithms",
    "Excel", "PowerPoint", "Notion", "Slack",
]

EDUCATION_KEYWORDS = [
    "b.e", "be", "b.tech", "btech", "bachelor", "b.sc", "bsc",
    "m.tech", "mtech", "master", "m.sc", "msc", "mba", "phd",
    "diploma", "sslc", "puc", "12th", "10th",
    "computer science", "information technology", "electronics",
    "electrical", "mechanical", "civil", "data science", "ai",
]

# Normalize once for fast case-insensitive membership checks.
_SKILLS_LOWER_MAP = {s.lower(): s for s in SKILLS_LIST}


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from a PDF file's bytes using PyPDF2."""
    text_parts = []
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    except Exception as exc:
        logger.error("Failed to parse PDF: %s", exc)
        raise ValueError(f"Could not read PDF file: {exc}")

    text = "\n".join(text_parts)
    if not text.strip():
        raise ValueError("No extractable text found in PDF (it may be a scanned image).")
    return text


def extract_skills(text: str) -> list:
    """
    Extract technical skills mentioned in `text` by matching against
    SKILLS_LIST. Uses spaCy's PhraseMatcher when available for robust,
    boundary-aware matching; falls back to regex word-boundary matching
    otherwise.
    """
    if not text:
        return []

    found = set()

    nlp = _get_nlp()
    if nlp and _MATCHER is not None:
        doc = nlp(text)
        matches = _MATCHER(doc)
        for match_id, start, end in matches:
            span_text = doc[start:end].text.lower()
            if span_text in _SKILLS_LOWER_MAP:
                found.add(_SKILLS_LOWER_MAP[span_text])
    else:
        # Regex fallback: word-boundary, case-insensitive search per skill.
        for skill in SKILLS_LIST:
            pattern = r"(?<![\w+#.])" + re.escape(skill) + r"(?![\w])"
            if re.search(pattern, text, flags=re.IGNORECASE):
                found.add(skill)

    return sorted(found)


# Matches things like: "5+ years", "3 years of experience", "2+ yrs",
# "over 4 years", "experience: 6 years"
_EXPERIENCE_PATTERNS = [
    re.compile(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)\s*(?:of)?\s*experience", re.IGNORECASE),
    re.compile(r"experience\s*(?:of|:)?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)", re.IGNORECASE),
    re.compile(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)", re.IGNORECASE),
]

# Fallback: infer years from a date range like "2019 - 2023" or "2019-Present"
_DATE_RANGE_PATTERN = re.compile(
    r"(19|20)\d{2}\s*(?:-|–|to)\s*((19|20)\d{2}|present|current)", re.IGNORECASE
)


def extract_experience_years(text: str) -> float:
    """Estimate total years of experience mentioned in the resume text."""
    if not text:
        return 0.0

    candidates = []
    for pattern in _EXPERIENCE_PATTERNS:
        for m in pattern.finditer(text):
            try:
                candidates.append(float(m.group(1)))
            except (ValueError, IndexError):
                continue

    if candidates:
        return max(candidates)

    # Fallback: sum up date ranges found in an "Experience" style resume.
    total_years = 0.0
    import datetime

    current_year = datetime.datetime.now().year
    for m in _DATE_RANGE_PATTERN.finditer(text):
        start_year = int(m.group(0)[:4])
        end_raw = m.group(2).lower()
        end_year = current_year if end_raw in ("present", "current") else int(end_raw)
        if end_year >= start_year:
            total_years += end_year - start_year

    return round(total_years, 1)


_DEGREE_PATTERNS = [
    (re.compile(r"\bph\.?d\.?\b", re.IGNORECASE), "PhD"),
    (re.compile(r"\bm\.?tech\.?\b", re.IGNORECASE), "M.Tech"),
    (re.compile(r"\bb\.?tech\.?\b", re.IGNORECASE), "B.Tech"),
    (re.compile(r"\bm\.?s\.?\b(?!\w)", re.IGNORECASE), "M.S."),
    (re.compile(r"\bb\.?s\.?\b(?!\w)", re.IGNORECASE), "B.S."),
    (re.compile(r"\bmaster'?s?\b", re.IGNORECASE), "Master's"),
    (re.compile(r"\bbachelor'?s?\b", re.IGNORECASE), "Bachelor's"),
    (re.compile(r"\bmba\b", re.IGNORECASE), "MBA"),
    (re.compile(r"\bm\.?c\.?a\.?\b", re.IGNORECASE), "MCA"),
    (re.compile(r"\bb\.?c\.?a\.?\b", re.IGNORECASE), "BCA"),
    (re.compile(r"\bdiploma\b", re.IGNORECASE), "Diploma"),
    (re.compile(r"\bassociate'?s?\s+degree\b", re.IGNORECASE), "Associate's"),
]

_FIELD_KEYWORDS = [
    "computer science", "information technology", "data science",
    "electronics", "electrical engineering", "mechanical engineering",
    "artificial intelligence", "software engineering", "mathematics",
    "statistics", "business administration", "economics",
]


def extract_education(text: str) -> dict:
    """
    Extract the highest education level and field of study mentioned.
    Returns {"degree": str | None, "field": str | None, "raw_matches": [...]}
    """
    if not text:
        return {"degree": None, "field": None, "raw_matches": []}

    # Degree precedence: highest qualification wins.
    precedence = ["PhD", "Master's", "M.Tech", "M.S.", "MBA", "MCA",
                  "Bachelor's", "B.Tech", "B.S.", "BCA", "Diploma", "Associate's"]

    found_degrees = []
    for pattern, label in _DEGREE_PATTERNS:
        if pattern.search(text):
            found_degrees.append(label)

    degree = None
    for level in precedence:
        if level in found_degrees:
            degree = level
            break

    field = None
    lowered = text.lower()
    for kw in _FIELD_KEYWORDS:
        if kw in lowered:
            field = kw.title()
            break

    return {"degree": degree, "field": field, "raw_matches": found_degrees}


def parse_resume(file_bytes: bytes) -> dict:
    """Full resume parsing pipeline: PDF -> text -> structured fields."""
    text = extract_text_from_pdf(file_bytes)
    skills = extract_skills(text)
    experience_years = extract_experience_years(text)
    education = extract_education(text)

    return {
        "text": text,
        "skills": skills,
        "experience_years": experience_years,
        "education": education,
    }