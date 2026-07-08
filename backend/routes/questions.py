from fastapi import APIRouter, Query
from typing import Optional
from ..services.question_bank import load_section_pool, strip_answers

router = APIRouter()


@router.get("/questions")
def get_questions(
    section: str = Query(...),
    type: Optional[str] = Query(None),
):
    questions = load_section_pool(section)
    if type:
        questions = [q for q in questions if q.get("type") == type]
    # Show newest questions first (appended last in JSON = newest)
    questions.reverse()
    # Remove correct answers before sending to the frontend
    return [strip_answers(q) for q in questions]
