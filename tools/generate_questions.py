#!/usr/bin/env python3
"""Validate, dedupe, and add new PTE practice questions to the bank.

Two ways to supply question content:
  1. --from-file: content already authored (e.g. by Claude in this session) as
     plain JSON — no API calls, no cost. This is the default/preferred path.
  2. --count (Gemini): optional fallback that generates content via the Gemini
     API. Kept for cases where authoring by hand isn't convenient. Gemini's
     main job in this project is answer scoring, not content generation.

Only text-based question types are supported — types that need pre-recorded
audio/image (most listening + several speaking types) are intentionally out of
scope because there is no media to attach.

Usage:
  # Preferred: validate + merge hand-authored content (no API calls)
  python tools/generate_questions.py --type grammar_select_blanks --from-file .tmp/gsb.json

  # Dry-run: write to .tmp/ for review, don't touch the bank
  python tools/generate_questions.py --type grammar_select_blanks --from-file .tmp/gsb_raw.json --out .tmp

  # Optional fallback: generate via Gemini, validate, dedupe, append
  python tools/generate_questions.py --type grammar_select_blanks --count 10

  # List supported types
  python tools/generate_questions.py --list

--count mode requires GOOGLE_API_KEY in the project .env (same key used for scoring).
--from-file mode needs no API key at all.
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_DIR = os.path.join(ROOT, "backend", "data")
EXAM_DATA_DIR = os.path.join(DATA_DIR, "exam")

MODEL_DEFAULT = "gemini-2.5-flash"


def _gemini_client():
    """Lazily create the Gemini client — only needed for --count generation."""
    from dotenv import load_dotenv
    load_dotenv(os.path.join(ROOT, ".env"))
    from google import genai
    return genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# type -> (section file, human task description for the prompt)
TYPES = {
    "mcq_single_reading": ("reading", "a reading comprehension multiple-choice question with ONE correct answer, based on a short academic passage"),
    "mcq_multiple_reading": ("reading", "a reading comprehension multiple-choice question with TWO OR MORE correct answers, based on a short academic passage"),
    "reorder_paragraphs": ("reading", "a re-order paragraphs task: 4-5 text boxes that form one coherent passage when correctly ordered"),
    "fill_blanks_dropdown": ("reading", "a fill-in-the-blanks (dropdown) reading task where each blank has 4 options"),
    "fill_blanks_drag": ("reading", "a fill-in-the-blanks (drag & drop) reading task with a word bank"),
    "grammar_error_correction": ("grammar", "a grammar error-correction question: a sentence with one underlined wrong word and options to replace it"),
    "grammar_select_blanks": ("grammar", "a grammar 'select the correct word' task with several independent sentences, each with a 4-option gap"),
    "grammar_drag_dialogue": ("grammar", "a short 4-8 line dialogue with blanks to complete using a word bank"),
    "vocabulary_fill_table": ("vocabulary", "a vocabulary 'fill the table' task relating words across two columns, with some cells blank"),
    "vocabulary_word_order": ("vocabulary", "a 'word order' task: scrambled words that form a correct sentence"),
    "essay": ("writing", "an argumentative essay prompt (200-300 words expected)"),
    "summarize_written_text": ("writing", "a 'summarize written text' task: one academic passage to be summarized in a single sentence"),
    "read_aloud": ("speaking", "a 'read aloud' task: one clear academic sentence/short paragraph (35-60 words)"),
    "respond_to_situation": ("speaking", "a 'respond to a situation' task: a short everyday scenario to respond to"),
}

# Defaults injected if the model omits timing fields.
DEFAULTS = {
    "mcq_single_reading": {"time_limit_seconds": 90},
    "mcq_multiple_reading": {"time_limit_seconds": 120},
    "reorder_paragraphs": {"time_limit_seconds": 120},
    "fill_blanks_dropdown": {"time_limit_seconds": 120},
    "fill_blanks_drag": {"time_limit_seconds": 120},
    "grammar_error_correction": {"time_limit_seconds": 60},
    "grammar_select_blanks": {"time_limit_seconds": 120},
    "grammar_drag_dialogue": {"time_limit_seconds": 120},
    "vocabulary_fill_table": {"time_limit_seconds": 120},
    "vocabulary_word_order": {"time_limit_seconds": 180},
    "essay": {"time_limit_seconds": 1200},
    "summarize_written_text": {"time_limit_seconds": 600},
    "read_aloud": {"time_limit_seconds": 40, "prep_time": 30, "record_time": 40},
    "respond_to_situation": {"time_limit_seconds": 40, "prep_time": 10, "record_time": 40},
}


# ── bank IO ────────────────────────────────────────────────────────────────
def _read(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_examples(qtype, section, n=2):
    """A few real examples of this type (with answers) for few-shot prompting."""
    out = []
    for base in (DATA_DIR, EXAM_DATA_DIR):
        for q in _read(os.path.join(base, f"{section}.json")).get(qtype, []):
            out.append(q)
    return out[:n]


def all_existing_ids():
    ids = set()
    for base in (DATA_DIR, EXAM_DATA_DIR):
        if not os.path.isdir(base):
            continue
        for fn in os.listdir(base):
            if fn.endswith(".json"):
                for lst in _read(os.path.join(base, fn)).values():
                    if isinstance(lst, list):
                        for q in lst:
                            if "id" in q:
                                ids.add(q["id"])
    return ids


def _norm(s):
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


def signature(qtype, q):
    """A dedup key from the main text of the question."""
    for k in ("text", "passage", "sentence", "prompt", "scenario"):
        if q.get(k):
            return _norm(q[k])[:120]
    if qtype == "grammar_select_blanks" and q.get("items"):
        return _norm(q["items"][0].get("text_before", ""))[:120]
    if qtype == "grammar_drag_dialogue":
        return _norm(json.dumps(q.get("lines", []), ensure_ascii=False))[:120]
    if qtype == "vocabulary_word_order" and q.get("items"):
        return _norm("".join(q["items"][0].get("words", [])))[:120]
    if qtype == "vocabulary_fill_table":
        return _norm(json.dumps(q.get("rows", []), ensure_ascii=False))[:120]
    if qtype == "reorder_paragraphs":
        return _norm("".join(q.get("paragraphs", [])))[:120]
    return _norm(json.dumps(q, ensure_ascii=False))[:120]


# ── validators (return None if OK, else a reason string) ─────────────────────
def _blanks_in_text(text):
    return sorted(int(m) for m in re.findall(r"___BLANK(\d+)___", text or ""))


def validate(qtype, q):
    def has(*keys):
        for k in keys:
            if k not in q:
                return f"missing '{k}'"
        return None

    if qtype in ("mcq_single_reading", "mcq_single_listening", "grammar_error_correction",
                 "highlight_correct_summary", "select_missing_word"):
        e = has("options", "correct_answer")
        if e:
            return e
        if not isinstance(q["options"], list) or len(q["options"]) < 2:
            return "options must be a list of >=2"
        if not isinstance(q["correct_answer"], int) or not (0 <= q["correct_answer"] < len(q["options"])):
            return "correct_answer out of range"
        if qtype == "mcq_single_reading" and not q.get("passage"):
            return "missing 'passage'"
        if qtype == "grammar_error_correction":
            if not q.get("sentence") or not q.get("underlined_word"):
                return "missing sentence/underlined_word"
            if q["underlined_word"] not in q["sentence"]:
                return "underlined_word not found in sentence"
        return None

    if qtype in ("mcq_multiple_reading", "mcq_multiple_listening"):
        e = has("options", "correct_answers")
        if e:
            return e
        if len(q["options"]) < 3:
            return "need >=3 options"
        ca = q["correct_answers"]
        if not isinstance(ca, list) or len(ca) < 1:
            return "correct_answers must be non-empty list"
        if any((not isinstance(i, int)) or i < 0 or i >= len(q["options"]) for i in ca):
            return "correct_answers index out of range"
        if qtype == "mcq_multiple_reading" and not q.get("passage"):
            return "missing 'passage'"
        return None

    if qtype == "reorder_paragraphs":
        e = has("paragraphs", "correct_order")
        if e:
            return e
        n = len(q["paragraphs"])
        if n < 3:
            return "need >=3 paragraphs"
        if sorted(q["correct_order"]) != list(range(n)):
            return "correct_order must be a permutation of paragraph indices"
        return None

    if qtype == "fill_blanks_dropdown":
        e = has("text", "blanks")
        if e:
            return e
        idxs = _blanks_in_text(q["text"])
        if idxs != list(range(len(q["blanks"]))):
            return "___BLANKn___ markers must be 0..N-1 matching blanks length"
        for b in q["blanks"]:
            if "options" not in b or "answer" not in b or "index" not in b:
                return "each blank needs index/options/answer"
            if b["answer"] not in b["options"]:
                return "blank answer not in its options"
        return None

    if qtype == "fill_blanks_drag":
        e = has("text", "blank_positions", "options", "correct_answers")
        if e:
            return e
        idxs = _blanks_in_text(q["text"])
        k = len(q["correct_answers"])
        if idxs != list(range(k)) or q["blank_positions"] != list(range(k)):
            return "blanks/positions must be 0..N-1 matching correct_answers"
        if any(a not in q["options"] for a in q["correct_answers"]):
            return "every correct answer must be in options"
        return None

    if qtype == "grammar_select_blanks":
        e = has("items")
        if e:
            return e
        if not q["items"]:
            return "items empty"
        for it in q["items"]:
            if not all(k in it for k in ("text_before", "text_after", "options", "answer")):
                return "item needs text_before/text_after/options/answer"
            if it["answer"] not in it["options"]:
                return "item answer not in options"
        return None

    if qtype == "grammar_drag_dialogue":
        e = has("word_bank", "lines", "correct_answers")
        if e:
            return e
        blanks = sum(1 for ln in q["lines"] for p in ln.get("parts", []) if p.get("blank"))
        if blanks != len(q["correct_answers"]):
            return f"blank count ({blanks}) != correct_answers ({len(q['correct_answers'])})"
        if any(a not in q["word_bank"] for a in q["correct_answers"]):
            return "every correct answer must be in word_bank"
        return None

    if qtype == "vocabulary_fill_table":
        e = has("columns", "rows")
        if e:
            return e
        ncol = len(q["columns"])
        blanks = 0
        for row in q["rows"]:
            cells = row.get("cells", [])
            if len(cells) != ncol:
                return "each row must have one cell per column"
            for c in cells:
                if c.get("blank"):
                    blanks += 1
                    if "answer" not in c:
                        return "blank cell needs answer"
                elif "value" not in c:
                    return "non-blank cell needs value"
        if blanks < 1:
            return "need at least one blank cell"
        return None

    if qtype == "vocabulary_word_order":
        e = has("items")
        if e:
            return e
        for it in q["items"]:
            words = it.get("words", [])
            if len(words) < 3:
                return "each item needs >=3 words"
            if sorted(it.get("correct_order", [])) != list(range(len(words))):
                return "correct_order must be a permutation of word indices"
        return None

    if qtype == "essay":
        return has("prompt")
    if qtype == "summarize_written_text":
        return has("passage")
    if qtype == "read_aloud":
        return has("text")
    if qtype == "respond_to_situation":
        return has("scenario")
    return f"no validator for type {qtype}"


# ── generation ───────────────────────────────────────────────────────────────
def build_prompt(qtype, section, desc, examples, count):
    ex = json.dumps(examples, ensure_ascii=False, indent=2)
    return f"""You are an expert PTE Academic item writer. Generate {count} brand-new \
{desc}.

Question type: "{qtype}" (section: {section}).

Match the EXACT JSON structure of these real examples (same keys, same shape),
including the answer fields so the questions are self-contained and scorable:

{ex}

Rules:
- Return ONLY a JSON array of {count} objects. No markdown, no commentary.
- Do NOT include an "id" field — it will be assigned automatically.
- Do NOT copy the example content; create fresh, varied, correct items.
- Ensure every answer is unambiguously correct and consistent with the fields
  (e.g. correct_answer index valid; ___BLANKn___ markers numbered 0..N-1;
  drag/dialogue answers present in the word bank/options).
- Keep language natural, academic where appropriate, and free of errors.
"""


def parse_array(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    data = json.loads(text)
    if isinstance(data, dict):
        # tolerate {"questions": [...]}
        for v in data.values():
            if isinstance(v, list):
                return v
        return [data]
    return data


def next_ids(qtype, n, taken):
    ids, i = [], 1
    while len(ids) < n:
        cand = f"gen_{qtype}_{i:03d}"
        if cand not in taken:
            ids.append(cand)
            taken.add(cand)
        i += 1
    return ids


def process_candidates(qtype, raw):
    """Validate, dedupe, default-fill, and id-assign a list of raw question dicts.

    Shared by both the Gemini path and the hand-authored (--from-file) path so
    every question — regardless of source — passes the same invariants.
    """
    section, _ = TYPES[qtype]
    existing_ids = all_existing_ids()
    seen_sigs = {signature(qtype, q) for q in load_examples(qtype, section, n=10_000)}
    accepted = []
    for q in raw:
        q["type"] = qtype
        q["section"] = section
        for k, v in DEFAULTS.get(qtype, {}).items():
            q.setdefault(k, v)
        reason = validate(qtype, q)
        if reason:
            print(f"  - rejected (invalid: {reason})")
            continue
        sig = signature(qtype, q)
        if sig in seen_sigs:
            print("  - rejected (duplicate)")
            continue
        seen_sigs.add(sig)
        accepted.append(q)

    ids = next_ids(qtype, len(accepted), existing_ids)
    accepted = [{"id": qid, **q} for q, qid in zip(accepted, ids)]
    return section, accepted


def generate(qtype, count, model):
    """Generate candidate questions via Gemini (optional fallback path)."""
    section, desc = TYPES[qtype]
    examples = load_examples(qtype, section)
    if not examples:
        print(f"  ! no seed examples for {qtype}; cannot few-shot", file=sys.stderr)
        return section, []
    prompt = build_prompt(qtype, section, desc, examples, count)
    resp = _gemini_client().models.generate_content(model=model, contents=prompt)
    raw = parse_array(resp.text)
    return process_candidates(qtype, raw)


def load_from_file(qtype, path):
    """Load hand-authored candidate questions from a JSON file.

    Accepts either a plain JSON array of question objects, or the bank's
    {"<type>": [...]} shape.
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        raw = data.get(qtype) or next((v for v in data.values() if isinstance(v, list)), [])
    else:
        raw = data
    return process_candidates(qtype, raw)


def append_to_bank(section, qtype, questions):
    path = os.path.join(DATA_DIR, f"{section}.json")
    bank = _read(path)
    bank.setdefault(qtype, [])
    bank[qtype].extend(questions)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)


def main():
    ap = argparse.ArgumentParser(description="Validate/merge PTE questions into the bank.")
    ap.add_argument("--type", help="question type (see --list)")
    ap.add_argument("--from-file", help="JSON file of hand-authored candidates (no API calls)")
    ap.add_argument("--count", type=int, help="generate this many via Gemini instead of --from-file")
    ap.add_argument("--model", default=MODEL_DEFAULT)
    ap.add_argument("--out", help="dry-run: write to this dir instead of the bank")
    ap.add_argument("--list", action="store_true", help="list supported types")
    args = ap.parse_args()

    if args.list or not args.type:
        print("Supported types:")
        for t, (sec, _) in TYPES.items():
            print(f"  {t:26s} -> {sec}")
        return
    if args.type not in TYPES:
        print(f"Unsupported type '{args.type}'. Use --list.", file=sys.stderr)
        sys.exit(1)
    if not args.from_file and not args.count:
        print("Provide --from-file <path> (preferred, no API calls) or --count (Gemini).", file=sys.stderr)
        sys.exit(1)

    if args.from_file:
        print(f"Validating candidates for {args.type} from {args.from_file}...")
        section, questions = load_from_file(args.type, args.from_file)
    else:
        print(f"Generating {args.count} x {args.type} with {args.model}...")
        section, questions = generate(args.type, args.count, args.model)

    print(f"Accepted {len(questions)} valid, non-duplicate questions.")
    if not questions:
        return

    if args.out:
        os.makedirs(args.out, exist_ok=True)
        outpath = os.path.join(args.out, f"{args.type}.json")
        with open(outpath, "w", encoding="utf-8") as f:
            json.dump({args.type: questions}, f, ensure_ascii=False, indent=2)
        print(f"[dry-run] wrote {outpath} — review, then run without --out to merge.")
    else:
        append_to_bank(section, args.type, questions)
        print(f"Appended to backend/data/{section}.json. Commit + push to deploy.")


if __name__ == "__main__":
    main()
