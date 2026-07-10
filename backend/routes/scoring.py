import json
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form
from ..models import SubmitAnswerRequest, SubmitAnswerResponse
from ..services.deterministic_scoring import score_question, _load_question
from ..services.gemini_scoring import score_essay, score_summarize_written_text, score_summarize_spoken_text, score_speaking, resolve_media_path
from ..database import get_connection

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Maps the browser-reported Content-Type (MediaRecorder's real codec, e.g.
# audio/mp4 on Safari/iOS vs audio/webm on Chrome/Firefox) to a file extension.
# Previously the upload was always saved as "<uuid>.webm" regardless of the
# actual recorded format, which made Gemini receive a mislabeled audio/webm
# mime for non-webm recordings — a likely cause of inconsistent transcription.
AUDIO_MIME_TO_EXT = {
    "audio/webm": ".webm",
    "audio/mp4": ".mp4",
    "audio/aac": ".aac",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
}

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
    # Save uploaded audio with the extension matching its real Content-Type
    # (the browser sets this from the actual MediaRecorder Blob, independent
    # of the filename the frontend sends) so downstream scoring doesn't have
    # to guess — see AUDIO_MIME_TO_EXT above.
    content_type = (audio.content_type or "").split(";")[0].strip().lower()
    ext = AUDIO_MIME_TO_EXT.get(content_type, ".webm")
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    content = await audio.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Get reference text from question data.
    # expected_answer takes priority: for answer_short_question, "transcript" is
    # the spoken question itself, not the answer — using it as the reference
    # would give Gemini the wrong scoring target.
    question = _load_question(question_type, question_id)
    reference = ""
    image_path = None
    if question:
        reference = question.get("expected_answer", "") or question.get("transcript", "") or question.get("text", "") or question.get("scenario", "")
        if question_type == "describe_image":
            image_path = resolve_media_path(question.get("image_url", ""))

    # Score with Gemini — pass the real content_type explicitly rather than
    # letting it be re-guessed from the file extension.
    result = score_speaking(filepath, question_type, reference, image_path, content_type or None)

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
