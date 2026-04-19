import json
from fastapi import APIRouter
from ..database import get_connection

router = APIRouter()


@router.delete("/progress/reset")
def reset_progress(user_id: str = "nicole"):
    conn = get_connection()
    conn.execute("DELETE FROM attempts WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM exam_sessions WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": f"Statistics for {user_id} have been reset."}


@router.get("/progress/overview")
def get_progress_overview(user_id: str = "nicole"):
    conn = get_connection()

    total = conn.execute(
        "SELECT COUNT(*) as c FROM attempts WHERE user_id = ?", (user_id,)
    ).fetchone()["c"]

    if total == 0:
        conn.close()
        return {
            "total_attempts": 0,
            "average_score": 0,
            "estimated_pte_score": 10,
            "section_averages": {},
            "question_type_averages": {},
            "recent_trend": [],
            "weakest_areas": [],
        }

    avg = conn.execute(
        "SELECT AVG(total_score) as a FROM attempts WHERE total_score IS NOT NULL AND user_id = ?",
        (user_id,),
    ).fetchone()["a"] or 0

    section_rows = conn.execute(
        "SELECT section, AVG(total_score) as avg_score FROM attempts WHERE total_score IS NOT NULL AND user_id = ? GROUP BY section",
        (user_id,),
    ).fetchall()
    section_averages = {r["section"]: round(r["avg_score"], 1) for r in section_rows}

    type_rows = conn.execute(
        "SELECT question_type, AVG(total_score) as avg_score FROM attempts WHERE total_score IS NOT NULL AND user_id = ? GROUP BY question_type",
        (user_id,),
    ).fetchall()
    question_type_averages = {r["question_type"]: round(r["avg_score"], 1) for r in type_rows}

    trend_rows = conn.execute(
        "SELECT total_score FROM attempts WHERE total_score IS NOT NULL AND user_id = ? ORDER BY created_at DESC LIMIT 20",
        (user_id,),
    ).fetchall()
    recent_trend = [r["total_score"] for r in reversed(trend_rows)]

    weakest_rows = conn.execute(
        """SELECT question_type, AVG(total_score) as avg_score
           FROM attempts WHERE total_score IS NOT NULL AND user_id = ?
           GROUP BY question_type
           ORDER BY avg_score ASC LIMIT 3""",
        (user_id,),
    ).fetchall()
    weakest_areas = [
        {"type": r["question_type"], "avg_score": round(r["avg_score"], 1), "tip": "Practice more questions of this type."}
        for r in weakest_rows
    ]

    pte_score = round(10 + (avg / 100) * 80)
    pte_score = max(10, min(90, pte_score))

    conn.close()

    return {
        "total_attempts": total,
        "average_score": round(avg, 1),
        "estimated_pte_score": pte_score,
        "section_averages": section_averages,
        "question_type_averages": question_type_averages,
        "recent_trend": recent_trend,
        "weakest_areas": weakest_areas,
    }
