"""
classifier.py
Predicts the most likely job role for a resume using a TF-IDF + Random
Forest classifier trained on synthetically generated resume snippets
across 7 roles. Trains once on startup and caches the model with joblib
so subsequent restarts (within the same container) load instantly.
"""

import os
import random
import logging

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

logger = logging.getLogger("hireai.classifier")

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "role_classifier.joblib")

ROLES = [
    "Data Scientist",
    "ML Engineer",
    "Web Developer",
    "Backend Developer",
    "Data Analyst",
    "DevOps",
    "Full Stack",
]

# ---------------------------------------------------------------------------
# Role -> vocabulary pools used to synthesize realistic-sounding resume
# snippets. Each snippet is built from a template + a random sample of
# role-relevant skills/phrases.
# ---------------------------------------------------------------------------
ROLE_SKILLS = {
    "Data Scientist": [
        "Python", "R", "pandas", "NumPy", "scikit-learn", "statistics",
        "hypothesis testing", "A/B testing", "data visualization", "Matplotlib",
        "Seaborn", "SQL", "machine learning models", "regression analysis",
        "feature engineering", "Jupyter notebooks", "predictive modeling",
        "clustering algorithms", "data cleaning", "Tableau",
    ],
    "ML Engineer": [
        "TensorFlow", "PyTorch", "Keras", "deep learning", "neural networks",
        "model deployment", "MLOps", "Docker", "Kubernetes", "feature stores",
        "model monitoring", "computer vision", "NLP pipelines",
        "Hugging Face transformers", "GPU training", "model optimization",
        "CI/CD for ML", "vector databases", "embeddings", "XGBoost",
    ],
    "Web Developer": [
        "HTML", "CSS", "JavaScript", "React", "Vue.js", "responsive design",
        "Webpack", "Sass", "accessibility", "cross-browser compatibility",
        "REST API integration", "Figma to code", "component libraries",
        "SEO best practices", "Bootstrap", "TypeScript", "Next.js",
        "performance optimization", "browser DevTools", "Tailwind CSS",
    ],
    "Backend Developer": [
        "Node.js", "Django", "Flask", "FastAPI", "Java", "Spring Boot",
        "REST API design", "microservices", "PostgreSQL", "MongoDB", "Redis",
        "message queues", "authentication systems", "API security",
        "database optimization", "caching strategies", "gRPC",
        "server-side architecture", "unit testing", "Docker",
    ],
    "Data Analyst": [
        "Excel", "SQL", "Power BI", "Tableau", "data cleaning",
        "dashboarding", "reporting", "pivot tables", "business metrics",
        "data storytelling", "statistical analysis", "Google Sheets",
        "KPI tracking", "trend analysis", "Python for analytics",
        "stakeholder reporting", "ETL basics", "data quality checks",
    ],
    "DevOps": [
        "Docker", "Kubernetes", "Jenkins", "CI/CD pipelines", "Terraform",
        "Ansible", "AWS", "Azure", "GCP", "infrastructure as code",
        "monitoring and alerting", "Linux administration", "Bash scripting",
        "Nginx", "load balancing", "container orchestration",
        "incident response", "GitOps", "security hardening", "Prometheus",
    ],
    "Full Stack": [
        "React", "Node.js", "Express.js", "MongoDB", "PostgreSQL",
        "REST API development", "TypeScript", "Docker", "authentication flows",
        "responsive UI", "state management", "Redux", "Next.js",
        "cloud deployment", "CI/CD", "GraphQL", "Tailwind CSS",
        "end-to-end testing", "Git workflows", "microservice integration",
    ],
}

_TEMPLATES = [
    "Experienced professional with hands-on expertise in {a}, {b}, and {c}. "
    "Proven track record building solutions using {d} and {e}, with strong "
    "focus on {f}.",

    "Skilled in {a} and {b}, with {years} years of experience delivering "
    "projects involving {c}, {d}, and {e}. Comfortable working with {f} in "
    "production environments.",

    "Passionate about {a} and {b}. Contributed to multiple projects covering "
    "{c}, {d}, and {e}, while collaborating cross-functionally on {f}.",

    "Results-driven contributor with a background in {a}, {b}, and {c}. "
    "Built and maintained systems leveraging {d} and {e}, focused heavily on {f}.",

    "Detail-oriented professional proficient in {a}, {b}, {c}, and {d}. "
    "Applied {e} extensively while ensuring high standards around {f}.",
]


def _synthesize_snippet(role: str, rng: random.Random) -> str:
    pool = ROLE_SKILLS[role]
    picks = rng.sample(pool, k=min(6, len(pool)))
    template = rng.choice(_TEMPLATES)
    years = rng.choice([1, 2, 3, 4, 5, 6, 7, 8])
    return template.format(
        a=picks[0], b=picks[1], c=picks[2], d=picks[3], e=picks[4], f=picks[5],
        years=years,
    )


def generate_synthetic_dataset(n_per_role: int = None, seed: int = 42):
    """
    Generate synthetic resume snippets across all 7 roles.
    Defaults to producing 300 total snippets (~43 per role, topped up to
    exactly 300).
    """
    rng = random.Random(seed)
    texts, labels = [], []

    total_target = 300
    base_per_role = total_target // len(ROLES)
    remainder = total_target - (base_per_role * len(ROLES))

    if n_per_role is not None:
        base_per_role = n_per_role
        remainder = 0

    for i, role in enumerate(ROLES):
        count = base_per_role + (1 if i < remainder else 0)
        for _ in range(count):
            texts.append(_synthesize_snippet(role, rng))
            labels.append(role)

    return texts, labels


def _build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(stop_words="english", max_features=2000, ngram_range=(1, 2))),
        ("clf", RandomForestClassifier(n_estimators=200, random_state=42, max_depth=None)),
    ])


_MODEL = None


def train_model(force: bool = False) -> Pipeline:
    """Train (or load a cached) TF-IDF + Random Forest role classifier."""
    global _MODEL

    if _MODEL is not None and not force:
        return _MODEL

    os.makedirs(MODEL_DIR, exist_ok=True)

    if not force and os.path.exists(MODEL_PATH):
        try:
            cached_model = joblib.load(MODEL_PATH)
            # A joblib model can deserialize successfully but still be unusable
            # when it was saved by a different scikit-learn version. Run a
            # lightweight prediction before trusting the cached pipeline.
            cached_model.predict_proba(["Python software engineer data analysis"])
            _MODEL = cached_model
            logger.info("Loaded cached role classifier from %s", MODEL_PATH)
            return _MODEL
        except Exception as exc:
            logger.warning(
                "Cached role classifier is incompatible or unusable (%s); retraining.",
                exc,
            )

    texts, labels = generate_synthetic_dataset()
    pipeline = _build_pipeline()
    pipeline.fit(texts, labels)

    try:
        joblib.dump(pipeline, MODEL_PATH)
        logger.info("Trained and saved role classifier to %s", MODEL_PATH)
    except Exception as exc:
        logger.warning("Could not persist model to disk: %s", exc)

    _MODEL = pipeline
    return _MODEL


def predict_role(resume_text: str):
    """Return (predicted_role: str, confidence: float 0-1) for resume_text."""
    model = train_model()
    text = (resume_text or "").strip()
    if not text:
        return "Unknown", 0.0

    proba = model.predict_proba([text])[0]
    classes = model.classes_
    best_idx = int(np.argmax(proba))
    return str(classes[best_idx]), round(float(proba[best_idx]), 3)
    print("role_classifier loaded")