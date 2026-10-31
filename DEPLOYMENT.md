# Deploy HireAI

This setup uses Vercel for the React frontend, Render for FastAPI, and PostgreSQL for durable application data. Resume and profile-image files still require persistent storage; this guide uses a Render disk mounted at `/var/data`.

## 1. Push the project to GitHub

Commit the project to a private or public GitHub repository. Do not commit `.env` files, Firebase service-account keys, SMTP passwords, Gemini keys, uploaded resumes, or local database files. The root `.gitignore` excludes local environment files, uploads, SQLite files, virtual environments, and frontend build output.

## 2. Create the production database

Create a PostgreSQL database with Render, Neon, or another managed provider. Copy its connection URL. Render may provide a `postgresql://` URL; the backend normalizes it to the psycopg driver automatically.

The existing local `backend/hireai.sqlite3` is not copied to the production database automatically. If its jobs, users, or applications must be preserved, plan a separate data migration before directing real users to production.

## 3. Deploy the API on Render

Create a **Web Service** connected to the repository:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`
- Python runtime: 3.11.x (the backend dependencies are pinned for Python 3.11)

Attach a persistent disk mounted at `/var/data`. Set these environment variables in Render (replace sample values):

- `DATABASE_URL`: managed PostgreSQL URL
- `UPLOAD_DIR`: `/var/data/uploads`
- `CORS_ORIGINS`: the exact deployed frontend origin, such as `https://hireai.vercel.app` (no trailing slash)
- `APP_URL`: the same frontend origin
- `FIREBASE_PROJECT_ID`: the Firebase project ID used by the frontend
- `RECRUITER_EMAILS`: comma-separated, approved recruiter email addresses
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_FROM_NAME`, `MAIL_SERVER`, `MAIL_PORT`, `MAIL_STARTTLS`, `MAIL_SSL_TLS`: SMTP provider settings, if email notifications are required
- `GEMINI_API_KEY`: required for AI mock interviews
- `GEMINI_MODEL`: optional; defaults to `gemini-2.5-flash`

The backend uses SQLite automatically when `DATABASE_URL` is omitted, but production should use managed PostgreSQL. The persistent disk is required for uploaded resumes and profile/company images. A local disk is tied to a service instance; do not scale the service to multiple instances while uploads use this disk. For multi-instance deployments, move uploads to object storage such as S3 or Cloudinary.

## 4. Deploy the frontend on Vercel

Import the same repository as a Vercel project:

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22 or newer

Set these build environment variables in Vercel:

- `VITE_API_BASE_URL`: public Render API origin, for example `https://hireai-api.onrender.com` (no trailing slash)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

Firebase web configuration is client-side configuration and is embedded in the frontend build. Never place Firebase Admin credentials, SMTP credentials, or Gemini keys in `VITE_*` variables.

## 5. Configure Firebase sign-in

In Firebase Console, open **Authentication > Settings > Authorized domains** and add the Vercel production domain and any custom domain. Enable the sign-in providers used by the app. The frontend and backend `*_PROJECT_ID` settings must refer to the same Firebase project.

## 6. Verify production

1. Open the Vercel URL and sign in with Firebase.
2. Check the API health URL: `https://YOUR-API/health` should return `{"status":"ok"}`.
3. Create a test student and recruiter account. Add the recruiter email to `RECRUITER_EMAILS` before testing recruiter access.
4. Upload a test resume, create a job, apply, and review the application to verify both PostgreSQL and persistent uploads.
5. Test shortlist email only after SMTP settings are present. Test AI mock interviews only after `GEMINI_API_KEY` is set.
6. Check browser developer tools for CORS or authentication errors. If the frontend domain changes, update both `CORS_ORIGINS` on Render and Firebase authorized domains, then redeploy/restart.

For local development, omit `VITE_API_BASE_URL` to keep using `http://localhost:8000`; set `CORS_ORIGINS` only when using a non-default local frontend origin.
