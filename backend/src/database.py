from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "compass.db"

_conn: Optional[sqlite3.Connection] = None


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA foreign_keys=ON")
    return _conn


def init_db() -> None:
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
            name        TEXT    NOT NULL,
            password_hash TEXT  NOT NULL,
            created_at  TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS uploads (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL REFERENCES users(id),
            filename      TEXT    NOT NULL,
            row_count     INTEGER NOT NULL,
            summary_json  TEXT    NOT NULL,
            results_json  TEXT    NOT NULL,
            created_at    TEXT    NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
    """)
    conn.commit()


# ── user queries ──


def create_user(email: str, name: str, password_hash: str) -> Dict[str, Any]:
    conn = get_conn()
    now = datetime.now(timezone.utc).isoformat()
    try:
        cur = conn.execute(
            "INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (email.strip().lower(), name.strip(), password_hash, now),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise ValueError("An account with this email already exists.")
    return {"id": cur.lastrowid, "email": email.strip().lower(), "name": name.strip()}


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    row = conn.execute(
        "SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?",
        (email.strip().lower(),),
    ).fetchone()
    if row is None:
        return None
    return dict(row)


# ── upload queries ──


def save_upload(
    user_id: int, filename: str, row_count: int, summary: dict, results: list
) -> int:
    conn = get_conn()
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.execute(
        "INSERT INTO uploads (user_id, filename, row_count, summary_json, results_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, filename, row_count, json.dumps(summary), json.dumps(results), now),
    )
    conn.commit()
    return cur.lastrowid  # type: ignore


def list_uploads(user_id: int) -> List[Dict[str, Any]]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, filename, row_count, summary_json, created_at FROM uploads WHERE user_id = ? ORDER BY id DESC",
        (user_id,),
    ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["summary"] = json.loads(d.pop("summary_json"))
        out.append(d)
    return out


def get_upload(upload_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    row = conn.execute(
        "SELECT id, filename, row_count, summary_json, results_json, created_at FROM uploads WHERE id = ? AND user_id = ?",
        (upload_id, user_id),
    ).fetchone()
    if row is None:
        return None
    d = dict(row)
    d["summary"] = json.loads(d.pop("summary_json"))
    d["results"] = json.loads(d.pop("results_json"))
    return d
