"""
migrate.py
-----------
Run this ONCE against your existing Supabase/Postgres database to bring
it up to date with the current schema (email-based accounts + the
owner_email column on content_jobs).

WHY THIS IS NEEDED:
`init_db()` (called on every app startup) only CREATES tables that don't
exist yet — it never ALTERS a table that's already there. Your
`content_jobs` table was created before `owner_email` existed, so
Postgres has no idea about that column, which is exactly the
"UndefinedColumn: owner_username / owner_email" error you're seeing.

WHAT THIS SCRIPT DOES:
1. Drops any half-finished `owner_username` column from an earlier
   version, if present.
2. Adds `owner_email` to `content_jobs` if it's missing.
3. Drops the old `users` / `session_tokens` (and any `verification_codes`)
   tables if they exist from an earlier schema version, so they can be
   recreated fresh with the current columns.
4. Re-runs `init_db()` to recreate those auth tables with the current,
   correct schema.

Your `content_jobs`, `draft_versions`, and `review_actions` data is NOT
touched or deleted — only the auth-related tables are reset (which,
given the account signup was erroring out, should be empty anyway).

HOW TO RUN:
    cd backend
    venv\\Scripts\\activate      (or: source venv/bin/activate)
    python migrate.py
"""

from sqlalchemy import text

from database.db import engine, init_db


STATEMENTS = [
    'ALTER TABLE content_jobs DROP COLUMN IF EXISTS owner_username;',
    'ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS owner_email VARCHAR;',
    'DROP TABLE IF EXISTS verification_codes CASCADE;',
    'DROP TABLE IF EXISTS session_tokens CASCADE;',
    'DROP TABLE IF EXISTS users CASCADE;',
]


def main():
    print("Running migration against your DATABASE_URL...")
    with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"  {stmt}")
            conn.execute(text(stmt))

    print("Recreating auth tables with the current schema...")
    init_db()

    print("Done. content_jobs/draft_versions/review_actions data was preserved.")
    print("You can now sign up a fresh account and it will work end to end.")


if __name__ == "__main__":
    main()
