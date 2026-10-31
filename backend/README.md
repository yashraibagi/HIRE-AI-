# HireAI backend

## Email notifications

Shortlist and match-threshold notifications are sent asynchronously with FastAPI `BackgroundTasks` using FastAPI-Mail. The email contains the student's name, job title, recruiter name, match percentage, status, and a link to the app.

1. Install backend dependencies with the Python 3.11 interpreter used to run this project: `python -m pip install -r requirements.txt`.
2. Copy `.env.example` to `.env` and fill in your SMTP provider's values for `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_SERVER`, and `MAIL_PORT`. Set `MAIL_STARTTLS` and `MAIL_SSL_TLS` according to the provider. Never commit `.env` or put SMTP credentials in frontend files.
3. Set `APP_URL` to the frontend URL students should visit. `FIREBASE_PROJECT_ID` defaults to this project's Firebase ID.
4. Set `RECRUITER_EMAILS` to a comma-separated allowlist of approved recruiter email addresses. Recruiter API routes require both a valid Firebase ID token and an allowlisted email; the browser-selected role alone does not grant recruiter access.
5. Restart Uvicorn after changing `.env`.

If SMTP settings are missing, the recruiter can still shortlist applicants; the API response says the email was not queued. Email delivery is best-effort through FastAPI background tasks, and SMTP failures are logged.

Threshold notification is queued once when application scoring reaches or exceeds the job's `minimum_threshold_score`. The application is not automatically marked shortlisted; the recruiter makes that decision explicitly with **Shortlist & Notify**.

## AI mock interview

The student Interview Prep area includes a five-question role-specific AI mock interview. Questions and answer evaluations use the Gemini generateContent API; interview sessions, answers, feedback, and scores are saved in SQLite and are only accessible to their owning student.

1. Add `GEMINI_API_KEY` to `backend/.env` and optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`). Never commit the API key or expose it in frontend code.
2. Restart the backend so it loads the environment setting and creates the mock-interview tables.
3. In the student dashboard, open **Interview Prep** and select **AI mock interview**.

If the API key is missing or the Gemini service is unavailable, the interview endpoints return a clear error; the static flashcard bank remains available.
