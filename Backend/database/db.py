"""
database/db.py
---------------
This file sets up the connection to your Supabase (PostgreSQL) database.

WHAT IS SUPABASE?
Supabase is a free, hosted PostgreSQL database. Instead of installing
Postgres on your own laptop, Supabase runs it in the cloud and gives you
a connection string. Every teammate's backend connects to the SAME
database, so everyone sees the same jobs, drafts, and reviews.

HOW TO GET YOUR CONNECTION STRING (do this once):
1. Go to https://supabase.com and sign up (free)
2. Click "New Project" -> give it a name -> set a database password
   (SAVE this password somewhere safe) -> choose a region -> Create
3. Wait ~2 minutes for the project to finish setting up
4. In the left sidebar, click the gear icon "Project Settings" -> "Database"
5. Under "Connection string", choose the "URI" tab and copy it.
   It looks like:
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
6. Replace [YOUR-PASSWORD] with the database password you set in step 2
7. Paste this whole string into backend/.env as DATABASE_URL
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env "
        "and paste your Supabase connection string into DATABASE_URL."
    )

# pool_pre_ping avoids "connection closed" errors after the DB has been idle
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """
    FastAPI dependency: gives each request its own database session,
    and always closes it afterward — even if an error happens.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Creates all tables defined in database/models_db.py if they don't
    already exist. Safe to run every time the app starts — it will not
    delete or overwrite existing tables/data.
    """
    from database import models_db  # noqa: F401 (import so tables register)

    Base.metadata.create_all(bind=engine)
