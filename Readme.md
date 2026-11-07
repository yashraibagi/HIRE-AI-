# HIRE-AI 🚀

HIRE-AI is an intelligent, full-stack recruitment platform designed to bridge the gap between recruiters and candidates. By leveraging Machine Learning and Natural Language Processing, it automates resume parsing, ATS scoring, and role classification to streamline the hiring process.

## 🌟 Key Features

- **Role-Based Workflows:** Distinct, secure interfaces for Recruiters (HR Dashboard) and Candidates (Student Dashboard).
- **AI-Powered ATS Scoring:** Automatically evaluates and scores candidate resumes against specific job descriptions.
- **Automated Role Classification:** Categorizes job postings and candidate profiles using a pre-trained ML model.
- **Skill Gap Analysis:** Highlights missing keywords and skills on candidate resumes to help students prepare for specific roles.
- **Secure Authentication:** Integrated Firebase authentication and protected routing.

## 🛠️ Tech Stack

**Frontend**

- React & Vite
- Tailwind CSS
- Firebase Authentication

**Backend & AI**

- FastAPI (Python)
- SQLAlchemy & PostgreSQL (Supabase)
- spaCy & Scikit-Learn (ML modeling)
- Uvicorn

## 📂 Project Structure

```text
HIRE-AI/
├── backend/
│   ├── models/              # Pre-trained ML models (e.g., role_classifier.joblib)
│   ├── database.py          # PostgreSQL database connection configuration
│   ├── db_models.py         # SQLAlchemy schemas
│   ├── main.py              # FastAPI application entry point
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React UI components
│   │   ├── pages/           # Role-based dashboard views
│   │   ├── services/        # API communication logic
│   │   └── context/         # React Context for Auth/State
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite bundler configuration
└── README.md
```
