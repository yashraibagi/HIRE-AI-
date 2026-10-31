from pathlib import Path
import os
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DATABASE_PATH = Path(__file__).resolve().parent / "hireai.sqlite3"

# Read DATABASE_URL from .env file; falls back to local SQLite if absent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH.as_posix()}")

# Standardize PostgreSQL URL prefix for SQLAlchemy compatibility
# Standardize PostgreSQL URL prefix to explicitly use the psycopg2 driver
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Initialize SQLAlchemy engine
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# 2. Initialize SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=True,  # Maintains active connections to cloud DB
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def initialize_database() -> None:
    # 1. Automatically create tables defined in SQLAlchemy models if missing
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    migrations = []
    datetime_column_type = "DATETIME" if IS_SQLITE else "TIMESTAMP WITH TIME ZONE"

    # 2. Check 'users' table columns safely
    if inspector.has_table("users"):
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "profile_resume_updated_at" not in user_columns:
            migrations.append(f"ALTER TABLE users ADD COLUMN profile_resume_updated_at {datetime_column_type}")
        if "profile_data" not in user_columns:
            migrations.append("ALTER TABLE users ADD COLUMN profile_data JSON NOT NULL DEFAULT '{}'")
        if "preferences" not in user_columns:
            migrations.append("ALTER TABLE users ADD COLUMN preferences JSON NOT NULL DEFAULT '{}'")
        if "profile_avatar_filename" not in user_columns:
            migrations.append("ALTER TABLE users ADD COLUMN profile_avatar_filename VARCHAR(255)")
        if "company_logo_filename" not in user_columns:
            migrations.append("ALTER TABLE users ADD COLUMN company_logo_filename VARCHAR(255)")

    # 3. Check 'applications' table columns safely
    if inspector.has_table("applications"):
        application_columns = {column["name"] for column in inspector.get_columns("applications")}
        if "summary" not in application_columns:
            migrations.append("ALTER TABLE applications ADD COLUMN summary TEXT NOT NULL DEFAULT ''")
        if "threshold_notified_at" not in application_columns:
            migrations.append(f"ALTER TABLE applications ADD COLUMN threshold_notified_at {datetime_column_type}")
        if "shortlisted_notified_at" not in application_columns:
            migrations.append(f"ALTER TABLE applications ADD COLUMN shortlisted_notified_at {datetime_column_type}")

    # 4. Run migration statements if missing columns were found
    if migrations:
        with engine.begin() as connection:
            for statement in migrations:
                connection.execute(text(statement))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()