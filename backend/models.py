from pydantic import BaseModel
from typing import Optional, Any


class SubmitAnswerRequest(BaseModel):
    mode: str  # 'exam' | 'practice'
    exam_session_id: Optional[str] = None
    question_type: str
    section: str
    question_id: str
    user_answer: Any
    time_spent_seconds: int
    user_id: str = "nicole"


class SubmitAnswerResponse(BaseModel):
    score_details: dict
    total_score: float
    max_score: float
    feedback: Optional[str] = None
    correct_answers: Optional[Any] = None


class StartExamResponse(BaseModel):
    session_id: str
    questions: list[dict]


class StartExamRequest(BaseModel):
    is_trial: bool = False
    user_id: str = "nicole"


class SubmitSectionRequest(BaseModel):
    session_id: str
    section: str
    answers: list[dict]
    user_id: str = "nicole"


class CompleteExamRequest(BaseModel):
    session_id: str
