"""Shared question-bank helpers used by both the practice and exam routes.

Questions live in two folders that together form a single logical bank:
  - backend/data/<section>.json        (main pool)
  - backend/data/exam/<section>.json    (extra pool, historically exam-only)

Both are merged (deduplicated by id) so every route draws from the full bank.
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
EXAM_DATA_DIR = os.path.join(DATA_DIR, "exam")

# Answer/solution fields removed before sending a question to the frontend.
HIDDEN_KEYS = {
    "correct_answer", "correct_answers", "correct_order",
    "expected_answer", "correct_text", "incorrect_indices",
}
# Types that legitimately need the transcript shown to the user.
TYPES_NEEDING_TRANSCRIPT = {"highlight_incorrect_words"}


def _load_file(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    questions: list[dict] = []
    for qtype_list in data.values():
        if isinstance(qtype_list, list):
            questions.extend(qtype_list)
    return questions


def load_section_pool(section: str) -> list[dict]:
    """Return all questions for a section from both data folders, deduped by id."""
    seen_ids: set[str] = set()
    pool: list[dict] = []
    for base in (DATA_DIR, EXAM_DATA_DIR):
        for q in _load_file(os.path.join(base, f"{section}.json")):
            qid = q.get("id")
            if qid in seen_ids:
                continue
            seen_ids.add(qid)
            pool.append(q)
    return pool


def strip_answers(q: dict) -> dict:
    """Remove answer fields from a question before sending it to the frontend."""
    hidden = set(HIDDEN_KEYS)
    if q.get("type") not in TYPES_NEEDING_TRANSCRIPT:
        hidden.add("transcript")
    q_copy = {k: v for k, v in q.items() if k not in hidden}

    if "blanks" in q_copy:
        q_copy["blanks"] = [
            {k: v for k, v in b.items() if k != "answer"} for b in q_copy["blanks"]
        ]
    if "lines" in q_copy and q_copy.get("type") == "grammar_drag_dialogue":
        q_copy["lines"] = [
            {k: v for k, v in line.items() if k != "answer"} for line in q_copy["lines"]
        ]
    if "items" in q_copy and q_copy.get("type") in ("grammar_select_blanks", "vocabulary_word_order"):
        q_copy["items"] = [
            {k: v for k, v in item.items() if k != "answer"} for item in q_copy["items"]
        ]
    if "rows" in q_copy and q_copy.get("type") == "vocabulary_fill_table":
        q_copy["rows"] = [
            {"cells": [{k: v for k, v in cell.items() if k != "answer"} for cell in row["cells"]]}
            for row in q_copy["rows"]
        ]
    return q_copy
