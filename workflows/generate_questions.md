# Workflow: Generate New Practice/Exam Questions with AI

## Objective
Grow the question bank so exams and practice stay fresh and non-repetitive.
Uses `tools/generate_questions.py` to generate, validate, deduplicate, and append
new questions to `backend/data/<section>.json`. Both the practice endpoint and the
exam (random, no-repeat) draw from this same bank.

## When to use
- The exam feels repetitive for a user (they've seen most of a type).
- You want more variety in a specific section/type.

## Prerequisites
- `GOOGLE_API_KEY` in the project `.env` (same key used for scoring).
- Run from the project root with the backend venv:
  `backend/venv/Scripts/python.exe tools/generate_questions.py ...`

## Supported types (text-only)
Only **text-based** types are supported — types that require pre-recorded audio or
images are out of scope (there is no media to attach):
- Reading: `mcq_single_reading`, `mcq_multiple_reading`, `reorder_paragraphs`,
  `fill_blanks_dropdown`, `fill_blanks_drag`
- Grammar: `grammar_error_correction`, `grammar_select_blanks`, `grammar_drag_dialogue`
- Vocabulary: `vocabulary_fill_table`, `vocabulary_word_order`
- Writing: `essay`, `summarize_written_text`
- Speaking (text prompt only): `read_aloud`, `respond_to_situation`

Run `... generate_questions.py --list` to see the mapping.

> Listening types and audio/image speaking types (`repeat_sentence`,
> `describe_image`, `write_from_dictation`, all `*_listening`, etc.) need a
> text-to-speech / media pipeline first — not yet built.

## Procedure (IMPORTANT: paid API — start small)
Per `CLAUDE.md`, Gemini is a paid API. **Always dry-run a small batch first and
review before running large batches or merging.**

1. **Dry-run** (writes to `.tmp/`, does NOT touch the bank):
   ```
   backend/venv/Scripts/python.exe tools/generate_questions.py \
     --type grammar_select_blanks --count 3 --out .tmp
   ```
2. **Review** `.tmp/<type>.json` for correctness, ambiguity, and naturalness.
3. **Merge** for real (validates + dedupes + appends, assigns `gen_<type>_NNN` ids):
   ```
   backend/venv/Scripts/python.exe tools/generate_questions.py \
     --type grammar_select_blanks --count 10
   ```
4. **Smoke test**: start the backend and open the type in Practice mode — confirm
   it renders and scores without errors (the exam error boundary is a safety net).
5. **Deploy**: `git add backend/data/<section>.json && git commit && git push`
   (Render auto-redeploys the backend in ~2-3 min).

## How it stays correct
The tool validates every generated question against per-type invariants before
accepting it, e.g.:
- MCQ: `correct_answer`/`correct_answers` indices within range.
- Fill-blanks: `___BLANKn___` markers numbered `0..N-1`, answers within options.
- `grammar_drag_dialogue`: number of blanks == `len(correct_answers)`, and every
  answer is present in the `word_bank` (this exact invariant caused an earlier
  exam crash — now enforced at generation time).
- Word order / reorder: `correct_order` is a valid permutation.
Invalid or duplicate items are dropped (logged), so only clean questions land.

## Self-improvement loop
- If a type frequently produces rejects, tighten its prompt in `TYPES`/`build_prompt`
  or add clearer few-shot examples to the bank (the tool few-shots from real data).
- If a new failure mode appears in rendering/scoring, add the invariant to
  `validate()` so it's caught at generation time.

## Cost / performance notes
- ~1 API call per `--type` invocation (all `--count` items in one request).
- `gemini-2.5-flash` is used by default; override with `--model`.
- Recommended cadence: batches of 10-15 per type, reviewed, then merged.
