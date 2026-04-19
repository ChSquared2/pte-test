import json
import os
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


def load_questions(section: str) -> list[dict]:
    filepath = os.path.join(DATA_DIR, f"{section}.json")
    if not os.path.exists(filepath):
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Flatten all question type arrays into a single list
    questions = []
    for qtype_list in data.values():
        if isinstance(qtype_list, list):
            questions.extend(qtype_list)
    return questions


@router.get("/questions")
def get_questions(
    section: str = Query(...),
    type: Optional[str] = Query(None),
):
    questions = load_questions(section)
    if type:
        questions = [q for q in questions if q.get("type") == type]
    # Show newest questions first (appended last in JSON = newest)
    questions.reverse()
    # Remove correct answers from response (don't leak to frontend)
    safe_questions = []
    # Types that need transcript shown to the user
    types_needing_transcript = {"highlight_incorrect_words"}
    for q in questions:
        hidden_keys = {"correct_answer", "correct_answers", "correct_order",
                       "expected_answer", "correct_text", "incorrect_indices"}
        if q.get("type") not in types_needing_transcript:
            hidden_keys.add("transcript")
        q_copy = {k: v for k, v in q.items() if k not in hidden_keys}
        # Keep blanks but remove answer field from each blank
        if "blanks" in q_copy:
            q_copy["blanks"] = [
                {k: v for k, v in b.items() if k != "answer"}
                for b in q_copy["blanks"]
            ]
        # Strip per-line `answer` from grammar_drag_dialogue so it doesn't leak.
        if "lines" in q_copy and q_copy.get("type") == "grammar_drag_dialogue":
            q_copy["lines"] = [
                {k: v for k, v in line.items() if k != "answer"}
                for line in q_copy["lines"]
            ]
        # Strip answers from grammar_select_blanks / vocabulary_word_order items
        if "items" in q_copy and q_copy.get("type") in ("grammar_select_blanks", "vocabulary_word_order"):
            q_copy["items"] = [
                {k: v for k, v in item.items() if k != "answer"}
                for item in q_copy["items"]
            ]
        # Strip answers from vocabulary_fill_table rows
        if "rows" in q_copy and q_copy.get("type") == "vocabulary_fill_table":
            q_copy["rows"] = [
                {"cells": [{k: v for k, v in cell.items() if k != "answer"} for cell in row["cells"]]}
                for row in q_copy["rows"]
            ]
        safe_questions.append(q_copy)
    return safe_questions
