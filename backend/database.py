import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "pte.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mode TEXT NOT NULL,
            exam_session_id TEXT,
            question_type TEXT NOT NULL,
            section TEXT NOT NULL,
            question_id TEXT NOT NULL,
            user_answer TEXT,
            score_details TEXT,
            total_score REAL,
            time_spent_seconds INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS exam_sessions (
            id TEXT PRIMARY KEY,
            started_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT,
            overall_score REAL,
            section_scores TEXT,
            status TEXT DEFAULT 'in_progress',
            is_trial INTEGER DEFAULT 0
        );
    """)
    # Add is_trial column if missing (migration for existing DBs)
    try:
        conn.execute("ALTER TABLE exam_sessions ADD COLUMN is_trial INTEGER DEFAULT 0")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # Column already exists
    # Add user_id columns (idempotent migration). Default 'nicole' so existing rows belong to her.
    for table in ("attempts", "exam_sessions"):
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'nicole'")
            conn.commit()
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()
