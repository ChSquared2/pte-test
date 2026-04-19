import json
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form
from ..models import SubmitAnswerRequest, SubmitAnswerResponse
from ..services.deterministic_scoring import score_question, _load_question
from ..services.gemini_scoring import score_essay, score_summarize_written_text, score_summarize_spoken_text, score_speaking
from ..database import get_connection

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# AI-scored question types
AI_TYPES = {
    "essay", "summarize_written_text", "summarize_spoken_text",
    "read_aloud", "repeat_sentence", "describe_image", "retell_lecture",
    "answer_short_question", "summarize_group_discussion", "respond_to_situation",
}


def _save_attempt(conn, req_mode, req_exam_session_id, req_question_type, req_section, req_question_id, user_answer, result, time_spent, user_id="nicole"):
    conn.execute(
        """INSERT INTO attempts (mode, exam_session_id, question_type, section, question_id, user_answer, score_details, total_score, time_spent_seconds, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (req_mode, req_exam_session_id, req_question_type, req_section, req_question_id,
         json.dumps(user_answer), json.dumps(result["score_details"]), result["total_score"], time_spent, user_id),
    )
    conn.commit()


@router.post("/scoring/submit", response_model=SubmitAnswerResponse)
def submit_answer(req: SubmitAnswerRequest):
    if req.question_type in AI_TYPES:
        result = _score_ai_text(req.question_type, req.question_id, req.user_answer)
    else:
        result = score_question(req.question_type, req.question_id, req.user_answer)

    conn = get_connection()
    _save_attempt(conn, req.mode, req.exam_session_id, req.question_type, req.section,
                  req.question_id, req.user_answer, result, req.time_spent_seconds, req.user_id)
    conn.close()

    return SubmitAnswerResponse(
        score_details=result["score_details"],
        total_score=result["total_score"],
        max_score=result["max_score"],
        feedback=result.get("feedback"),
        correct_answers=result.get("correct_answers"),
    )


@router.post("/scoring/speaking", response_model=SubmitAnswerResponse)
async def submit_speaking(
    audio: UploadFile = File(...),
    question_id: str = Form(...),
    question_type: str = Form(...),
    mode: str = Form("practice"),
    time_spent_seconds: int = Form(0),
    exam_session_id: str = Form(None),
    user_id: str = Form("nicole"),
):
    # Save uploaded audio
    filename = f"{uuid.uuid4()}.webm"
    filepath = os.path.join(UPLOADS_DIR, filename)
    content = await audio.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Get reference text from question data
    question = _load_question(question_type, question_id)
    reference = ""
    if question:
        reference = question.get("transcript", "") or question.get("text", "") or question.get("scenario", "") or question.get("expected_answer", "")

    # Score with Gemini
    result = score_speaking(filepath, question_type, reference)

    # Determine section
    section = "speaking"

    conn = get_connection()
    _save_attempt(conn, mode, exam_session_id, question_type, section,
                  question_id, filename, result, time_spent_seconds, user_id)
    conn.close()

    return SubmitAnswerResponse(
        score_details=result["score_details"],
        total_score=result["total_score"],
        max_score=result["max_score"],
        feedback=result.get("feedback"),
        correct_answers=result.get("correct_answers"),
    )


def _score_ai_text(question_type: str, question_id: str, user_answer) -> dict:
    question = _load_question(question_type, question_id)
    if not question:
        return {"score_details": {}, "total_score": 0, "max_score": 0, "feedback": "Question not found."}

    text = str(user_answer)

    if question_type == "essay":
        return score_essay(text, question.get("prompt", ""))
    elif question_type == "summarize_written_text":
        return score_summarize_written_text(text, question.get("passage", ""))
    elif question_type == "summarize_spoken_text":
        return score_summarize_spoken_text(text, question.get("transcript", ""))
    else:
        return {"score_details": {}, "total_score": 0, "max_score": 0, "feedback": f"AI scoring not implemented for {question_type}"}
