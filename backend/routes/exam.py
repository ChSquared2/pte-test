import json
import os
import uuid
from fastapi import APIRouter
from ..models import StartExamRequest, SubmitSectionRequest, CompleteExamRequest
from ..database import get_connection
from ..services.deterministic_scoring import score_question

router = APIRouter()

EXAM_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "exam")

# Exam structure: sections, question types, counts, and timing
EXAM_STRUCTURE = [
    {
        "key": "speaking_writing",
        "label": "Speaking & Writing",
        "timer_type": "per_question",
        "time_limit_seconds": 2400,
        "data_sections": ["speaking", "writing"],
        "questions": [
            ("read_aloud", 2),
            ("repeat_sentence", 2),
            ("describe_image", 1),
            ("answer_short_question", 2),
            ("summarize_written_text", 1),
            ("essay", 1),
        ],
    },
    {
        "key": "reading",
        "label": "Reading",
        "timer_type": "section",
        "time_limit_seconds": 1200,
        "data_sections": ["reading"],
        "questions": [
            ("mcq_single_reading", 2),
            ("mcq_multiple_reading", 1),
            ("reorder_paragraphs", 1),
            ("fill_blanks_dropdown", 2),
            ("fill_blanks_drag", 2),
        ],
    },
    {
        "key": "grammar_vocabulary",
        "label": "Grammar & Vocabulary",
        "timer_type": "section",
        "time_limit_seconds": 900,
        "data_sections": ["grammar", "vocabulary"],
        "questions": [
            ("grammar_error_correction", 2),
            ("grammar_select_blanks", 2),
            ("grammar_drag_dialogue", 1),
            ("vocabulary_fill_table", 1),
            ("vocabulary_word_order", 2),
        ],
    },
    {
        "key": "listening",
        "label": "Listening",
        "timer_type": "per_question",
        "time_limit_seconds": 1500,
        "data_sections": ["listening"],
        "questions": [
            ("summarize_spoken_text", 1),
            ("mcq_multiple_listening", 1),
            ("fill_blanks_type_in", 1),
            ("highlight_correct_summary", 1),
            ("mcq_single_listening", 1),
            ("select_missing_word", 1),
            ("highlight_incorrect_words", 1),
            ("write_from_dictation", 2),
        ],
    },
]

# Keys to strip from questions before sending to frontend
HIDDEN_KEYS = {
    "correct_answer", "correct_answers", "correct_order",
    "expected_answer", "correct_text", "incorrect_indices",
}

# Types that need transcript shown to user
TYPES_NEEDING_TRANSCRIPT = {"highlight_incorrect_words"}


def load_exam_questions(section: str) -> list[dict]:
    """Load questions from the exam-specific data directory."""
    filepath = os.path.join(EXAM_DATA_DIR, f"{section}.json")
    if not os.path.exists(filepath):
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    questions = []
    for qtype_list in data.values():
        if isinstance(qtype_list, list):
            questions.extend(qtype_list)
    return questions


def strip_answers(q: dict) -> dict:
    """Remove answer fields from a question before sending to frontend."""
    hidden = set(HIDDEN_KEYS)
    if q.get("type") not in TYPES_NEEDING_TRANSCRIPT:
        hidden.add("transcript")
    q_copy = {k: v for k, v in q.items() if k not in hidden}
    # Strip answers from blanks
    if "blanks" in q_copy:
        q_copy["blanks"] = [
            {k: v for k, v in b.items() if k != "answer"}
            for b in q_copy["blanks"]
        ]
    # Strip answers from grammar_select_blanks items
    if "items" in q_copy and q_copy.get("type") in ("grammar_select_blanks", "vocabulary_word_order"):
        q_copy["items"] = [
            {k: v for k, v in item.items() if k != "answer"}
            for item in q_copy["items"]
        ]
    # Strip answers from grammar_drag_dialogue lines
    if "lines" in q_copy and q_copy.get("type") == "grammar_drag_dialogue":
        q_copy["lines"] = [
            {k: v for k, v in line.items() if k != "answer"}
            for line in q_copy["lines"]
        ]
    # Strip answers from vocabulary_fill_table rows
    if "rows" in q_copy and q_copy.get("type") == "vocabulary_fill_table":
        q_copy["rows"] = [
            {"cells": [{k: v for k, v in cell.items() if k != "answer"} for cell in row["cells"]]}
            for row in q_copy["rows"]
        ]
    return q_copy


@router.post("/exam/start")
def start_exam(req: StartExamRequest = StartExamRequest()):
    session_id = str(uuid.uuid4())
    conn = get_connection()
    conn.execute(
        "INSERT INTO exam_sessions (id, is_trial, user_id) VALUES (?, ?, ?)",
        (session_id, 1 if req.is_trial else 0, req.user_id),
    )
    conn.commit()
    conn.close()

    # Build sections with questions
    sections = []
    for section_def in EXAM_STRUCTURE:
        # Load all questions from the exam data files for this section
        all_qs = []
        for data_section in section_def["data_sections"]:
            all_qs.extend(load_exam_questions(data_section))

        # Pick questions by type and count
        section_questions = []
        for qtype, count in section_def["questions"]:
            type_qs = [q for q in all_qs if q.get("type") == qtype]
            section_questions.extend(type_qs[:count])

        sections.append({
            "key": section_def["key"],
            "label": section_def["label"],
            "timer_type": section_def["timer_type"],
            "time_limit_seconds": section_def["time_limit_seconds"],
            "questions": [strip_answers(q) for q in section_questions],
        })

    return {"session_id": session_id, "sections": sections, "is_trial": req.is_trial}


@router.post("/exam/submit-section")
def submit_section(req: SubmitSectionRequest):
    conn = get_connection()
    results = []

    for answer_data in req.answers:
        question_id = answer_data.get("question_id", "")
        question_type = answer_data.get("question_type", "")
        user_answer = answer_data.get("user_answer")
        time_spent = answer_data.get("time_spent_seconds", 0)

        result = score_question(question_type, question_id, user_answer)

        conn.execute(
            """INSERT INTO attempts (mode, exam_session_id, question_type, section, question_id, user_answer, score_details, total_score, time_spent_seconds, user_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "exam",
                req.session_id,
                question_type,
                req.section,
                question_id,
                json.dumps(user_answer),
                json.dumps(result["score_details"]),
                result["total_score"],
                time_spent,
                req.user_id,
            ),
        )
        results.append(result)

    conn.commit()
    conn.close()
    return {"results": results}


@router.post("/exam/complete")
def complete_exam(req: CompleteExamRequest):
    conn = get_connection()

    # Calculate section scores
    rows = conn.execute(
        "SELECT section, AVG(total_score) as avg FROM attempts WHERE exam_session_id = ? GROUP BY section",
        (req.session_id,),
    ).fetchall()

    section_scores = {r["section"]: round(r["avg"], 1) for r in rows}

    # Overall PTE score
    if section_scores:
        avg = sum(section_scores.values()) / len(section_scores)
        pte_score = round(10 + (avg / 100) * 80)
        pte_score = max(10, min(90, pte_score))
    else:
        pte_score = 10

    # Check if this is a trial session
    is_trial = conn.execute(
        "SELECT is_trial FROM exam_sessions WHERE id = ?", (req.session_id,)
    ).fetchone()
    trial = is_trial and is_trial["is_trial"] == 1

    if trial:
        conn.execute("DELETE FROM attempts WHERE exam_session_id = ?", (req.session_id,))
        conn.execute("DELETE FROM exam_sessions WHERE id = ?", (req.session_id,))
    else:
        conn.execute(
            """UPDATE exam_sessions SET status = 'completed', completed_at = datetime('now'),
               overall_score = ?, section_scores = ? WHERE id = ?""",
            (pte_score, json.dumps(section_scores), req.session_id),
        )

    conn.commit()
    conn.close()

    return {
        "id": req.session_id,
        "overall_score": pte_score,
        "section_scores": section_scores,
        "status": "completed",
        "is_trial": trial,
    }


@router.get("/exam/{session_id}/results")
def get_results(session_id: str):
    conn = get_connection()
    session = conn.execute(
        "SELECT * FROM exam_sessions WHERE id = ?", (session_id,)
    ).fetchone()

    if not session:
        conn.close()
        return {"error": "Session not found"}

    attempts = conn.execute(
        "SELECT * FROM attempts WHERE exam_session_id = ? ORDER BY id",
        (session_id,),
    ).fetchall()

    conn.close()

    return {
        "id": session["id"],
        "started_at": session["started_at"],
        "completed_at": session["completed_at"],
        "overall_score": session["overall_score"],
        "section_scores": json.loads(session["section_scores"]) if session["section_scores"] else {},
        "status": session["status"],
        "attempts": [
            {
                "question_id": a["question_id"],
                "question_type": a["question_type"],
                "section": a["section"],
                "total_score": a["total_score"],
                "score_details": json.loads(a["score_details"]) if a["score_details"] else {},
                "time_spent_seconds": a["time_spent_seconds"],
            }
            for a in attempts
        ],
    }
