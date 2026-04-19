import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


def _load_question(question_type: str, question_id: str) -> dict | None:
    """Find a question by its ID across all data files (including exam/ subdirectory)."""
    search_dirs = [DATA_DIR, os.path.join(DATA_DIR, "exam")]
    for search_dir in search_dirs:
        if not os.path.isdir(search_dir):
            continue
        for filename in os.listdir(search_dir):
            if not filename.endswith(".json"):
                continue
            filepath = os.path.join(search_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            for qtype_list in data.values():
                if isinstance(qtype_list, list):
                    for q in qtype_list:
                        if q.get("id") == question_id:
                            return q
    return None


def score_question(question_type: str, question_id: str, user_answer) -> dict:
    """Route to the correct scoring function based on question type."""
    question = _load_question(question_type, question_id)
    if not question:
        return {"score_details": {}, "total_score": 0, "max_score": 0, "feedback": "Question not found."}

    scorers = {
        "mcq_single_reading": score_mcq_single,
        "mcq_single_listening": score_mcq_single,
        "mcq_multiple_reading": score_mcq_multiple,
        "mcq_multiple_listening": score_mcq_multiple,
        "fill_blanks_dropdown": score_fill_blanks_dropdown,
        "fill_blanks_drag": score_fill_blanks_drag,
        "reorder_paragraphs": score_reorder_paragraphs,
        "fill_blanks_type_in": score_fill_blanks_type_in,
        "highlight_incorrect_words": score_highlight_incorrect_words,
        "write_from_dictation": score_write_from_dictation,
        "highlight_correct_summary": score_mcq_single,
        "select_missing_word": score_mcq_single,
        "grammar_error_correction": score_mcq_single,
        "grammar_select_blanks": score_grammar_select_blanks,
        "grammar_drag_dialogue": score_grammar_drag_dialogue,
        "vocabulary_fill_table": score_vocabulary_fill_table,
        "vocabulary_word_order": score_vocabulary_word_order,
    }

    scorer = scorers.get(question_type)
    if not scorer:
        return {"score_details": {}, "total_score": 0, "max_score": 0, "feedback": f"Scoring not implemented for {question_type}"}

    return scorer(question, user_answer)


def score_mcq_single(question: dict, user_answer) -> dict:
    correct = int(user_answer) == question["correct_answer"]
    score = 1 if correct else 0
    return {
        "score_details": {"correct": correct},
        "total_score": score * 100,
        "max_score": 100,
        "feedback": "Correct!" if correct else f"Incorrect. The correct answer was option {question['correct_answer'] + 1}.",
        "correct_answers": question["correct_answer"],
    }


def score_mcq_multiple(question: dict, user_answer) -> dict:
    correct_set = set(question["correct_answers"])
    user_set = set(int(a) for a in user_answer) if user_answer else set()
    correct_selected = correct_set & user_set
    incorrect_selected = user_set - correct_set
    score = max(0, len(correct_selected) - len(incorrect_selected))
    max_score = len(correct_set)
    return {
        "score_details": {
            "correct_selected": len(correct_selected),
            "incorrect_selected": len(incorrect_selected),
            "total_correct": len(correct_set),
        },
        "total_score": (score / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You got {len(correct_selected)}/{len(correct_set)} correct answers.",
        "correct_answers": question["correct_answers"],
    }


def score_fill_blanks_dropdown(question: dict, user_answer) -> dict:
    blanks = question["blanks"]
    if not isinstance(user_answer, list):
        user_answer = []
    correct = 0
    for i, blank in enumerate(blanks):
        if i < len(user_answer) and user_answer[i] == blank["answer"]:
            correct += 1
    max_score = len(blanks)
    return {
        "score_details": {"correct_blanks": correct, "total_blanks": max_score},
        "total_score": (correct / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You filled {correct}/{max_score} blanks correctly.",
        "correct_answers": [b["answer"] for b in blanks],
    }


def score_fill_blanks_drag(question: dict, user_answer) -> dict:
    correct_answers = question["correct_answers"]
    if not isinstance(user_answer, list):
        user_answer = []
    correct = 0
    for i, ans in enumerate(correct_answers):
        if i < len(user_answer) and user_answer[i] == ans:
            correct += 1
    max_score = len(correct_answers)
    return {
        "score_details": {"correct_blanks": correct, "total_blanks": max_score},
        "total_score": (correct / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You placed {correct}/{max_score} words correctly.",
        "correct_answers": question["correct_answers"],
    }


def score_reorder_paragraphs(question: dict, user_answer) -> dict:
    correct_order = question["correct_order"]
    if not isinstance(user_answer, list):
        user_answer = []
    # Count correct adjacent pairs
    score = 0
    max_score = len(correct_order) - 1
    for i in range(len(user_answer) - 1):
        pair = (user_answer[i], user_answer[i + 1])
        for j in range(len(correct_order) - 1):
            if (correct_order[j], correct_order[j + 1]) == pair:
                score += 1
                break
    return {
        "score_details": {"correct_pairs": score, "total_pairs": max_score},
        "total_score": (score / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You got {score}/{max_score} adjacent pairs correct.",
        "correct_answers": question["correct_order"],
    }


def score_fill_blanks_type_in(question: dict, user_answer) -> dict:
    correct_answers = question["correct_answers"]
    if not isinstance(user_answer, list):
        user_answer = []
    correct = 0
    for i, ans in enumerate(correct_answers):
        if i < len(user_answer) and user_answer[i].strip().lower() == ans.strip().lower():
            correct += 1
    max_score = len(correct_answers)
    return {
        "score_details": {"correct_blanks": correct, "total_blanks": max_score},
        "total_score": (correct / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You typed {correct}/{max_score} words correctly.",
        "correct_answers": question["correct_answers"],
    }


def score_highlight_incorrect_words(question: dict, user_answer) -> dict:
    incorrect_indices = set(question["incorrect_indices"])
    user_set = set(int(i) for i in user_answer) if user_answer else set()
    correct_clicks = len(incorrect_indices & user_set)
    wrong_clicks = len(user_set - incorrect_indices)
    score = max(0, correct_clicks - wrong_clicks)
    max_score = len(incorrect_indices)
    return {
        "score_details": {"correct_clicks": correct_clicks, "wrong_clicks": wrong_clicks, "total_incorrect": max_score},
        "total_score": (score / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You identified {correct_clicks}/{max_score} incorrect words ({wrong_clicks} wrong clicks).",
        "correct_answers": question["incorrect_indices"],
    }


def score_write_from_dictation(question: dict, user_answer) -> dict:
    from difflib import SequenceMatcher

    correct_text = question["correct_text"]
    user_words = str(user_answer).lower().strip().split()
    correct_words = correct_text.lower().strip().split()
    matcher = SequenceMatcher(None, user_words, correct_words)
    score = sum(block.size for block in matcher.get_matching_blocks())
    max_score = len(correct_words)
    return {
        "score_details": {"correct_words": score, "total_words": max_score},
        "total_score": (score / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You got {score}/{max_score} words correct.",
        "correct_answers": question["correct_text"],
    }


def score_grammar_select_blanks(question: dict, user_answer) -> dict:
    items = question["items"]
    if not isinstance(user_answer, list):
        user_answer = []
    correct = 0
    for i, item in enumerate(items):
        if i < len(user_answer) and user_answer[i] == item["answer"]:
            correct += 1
    max_score = len(items)
    return {
        "score_details": {"correct_blanks": correct, "total_blanks": max_score},
        "total_score": (correct / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You selected {correct}/{max_score} correct answers.",
        "correct_answers": [item["answer"] for item in items],
    }


def score_grammar_drag_dialogue(question: dict, user_answer) -> dict:
    correct_answers = question["correct_answers"]
    if not isinstance(user_answer, list):
        user_answer = []
    correct = 0
    for i, ans in enumerate(correct_answers):
        if i < len(user_answer) and user_answer[i] == ans:
            correct += 1
    max_score = len(correct_answers)
    return {
        "score_details": {"correct_blanks": correct, "total_blanks": max_score},
        "total_score": (correct / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You placed {correct}/{max_score} words correctly in the dialogue.",
        "correct_answers": question["correct_answers"],
    }


def score_vocabulary_fill_table(question: dict, user_answer) -> dict:
    if not isinstance(user_answer, list):
        user_answer = []
    expected = []
    for row in question["rows"]:
        for cell in row["cells"]:
            if cell.get("blank"):
                expected.append(cell["answer"].strip().lower())
    correct = 0
    for i, exp in enumerate(expected):
        if i < len(user_answer) and str(user_answer[i]).strip().lower() == exp:
            correct += 1
    max_score = len(expected)
    return {
        "score_details": {"correct_cells": correct, "total_cells": max_score},
        "total_score": (correct / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You filled {correct}/{max_score} cells correctly.",
        "correct_answers": [cell["answer"] for row in question["rows"] for cell in row["cells"] if cell.get("blank")],
    }


def score_vocabulary_word_order(question: dict, user_answer) -> dict:
    items = question["items"]
    if not isinstance(user_answer, list):
        user_answer = []
    correct = 0
    for i, item in enumerate(items):
        if i < len(user_answer):
            user_order = user_answer[i] if isinstance(user_answer[i], list) else []
            if user_order == item["correct_order"]:
                correct += 1
    max_score = len(items)
    return {
        "score_details": {"correct_sentences": correct, "total_sentences": max_score},
        "total_score": (correct / max_score * 100) if max_score > 0 else 0,
        "max_score": 100,
        "feedback": f"You arranged {correct}/{max_score} sentences correctly.",
        "correct_answers": [item["correct_order"] for item in items],
    }
