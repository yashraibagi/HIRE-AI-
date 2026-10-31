from pathlib import Path
import os
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DATABASE_PATH = Path(__file__).resolve().parent / "hireai.sqlite3"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH.as_posix()}")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
IS_SQLITE = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    user_migrations = []
    datetime_column_type = "DATETIME" if IS_SQLITE else "TIMESTAMP WITH TIME ZONE"
    if "profile_resume_updated_at" not in user_columns:
        user_migrations.append(f"ALTER TABLE users ADD COLUMN profile_resume_updated_at {datetime_column_type}")
    if "profile_data" not in user_columns:
        user_migrations.append("ALTER TABLE users ADD COLUMN profile_data JSON NOT NULL DEFAULT '{}'")
    if "preferences" not in user_columns:
        user_migrations.append("ALTER TABLE users ADD COLUMN preferences JSON NOT NULL DEFAULT '{}'")
    if "profile_avatar_filename" not in user_columns:
        user_migrations.append("ALTER TABLE users ADD COLUMN profile_avatar_filename VARCHAR(255)")
    if "company_logo_filename" not in user_columns:
        user_migrations.append("ALTER TABLE users ADD COLUMN company_logo_filename VARCHAR(255)")
    application_columns = {
        column["name"] for column in inspect(engine).get_columns("applications")
    }
    migrations = user_migrations
    if "summary" not in application_columns:
        migrations.append("ALTER TABLE applications ADD COLUMN summary TEXT NOT NULL DEFAULT ''")
    if "threshold_notified_at" not in application_columns:
        migrations.append(f"ALTER TABLE applications ADD COLUMN threshold_notified_at {datetime_column_type}")
    if "shortlisted_notified_at" not in application_columns:
        migrations.append(f"ALTER TABLE applications ADD COLUMN shortlisted_notified_at {datetime_column_type}")
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
