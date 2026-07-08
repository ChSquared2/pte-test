# Workflow: Grow the Question Bank (text, audio, and images)

## Objective
Grow the question bank so exams and practice stay fresh and non-repetitive.
Two tools cover this:
- `tools/generate_questions.py` — text, audio-transcript, and TTS-narrated
  questions (26 of 27 types). Content is authored by hand (Claude, no API
  cost) or optionally by Gemini; **Gemini's only paid role in this project is
  scoring**, not content generation.
- `tools/add_image_questions.py` — registers real user-supplied photos as
  `describe_image` questions.

Both write into `backend/data/<section>.json`, the same bank the practice
endpoint and the exam (random, no-repeat selection) draw from.

## Prerequisites
- Run from the project root with the backend venv:
  `backend/venv/Scripts/python.exe tools/<tool>.py ...`
- `edge-tts` (installed in the venv, listed in `backend/requirements.txt` as a
  tooling-only dependency — not used at Render runtime) synthesizes real mp3
  files locally, free, no API key.
- `GOOGLE_API_KEY` is only needed for the optional Gemini `--count` fallback in
  `generate_questions.py` (rarely used) — not for `--from-file` or for scoring
  during actual student practice, which already has the key configured.

---

## Part 1 — Text & audio questions (`tools/generate_questions.py`)

Run `... generate_questions.py --list` to see all 26 supported types.

### Content authoring convention
- **Text types** (grammar, reading, vocabulary, writing, `read_aloud`,
  `respond_to_situation`): the JSON candidate just needs the real question
  fields (see the schema table in the tool's `TYPES`/`validate()`).
- **Audio types** (everything in `AUDIO_TYPES` — 8 listening + `repeat_sentence`,
  `retell_lecture`, `summarize_group_discussion`, `answer_short_question`):
  author the *spoken* text in the right field (usually `transcript`, or
  `correct_text` for dictation, or `transcript_with_blanks` + `correct_answers`
  for fill-in-the-blank listening). **Do not set `audio_url` yourself** — a
  real mp3 is synthesized automatically on merge via `edge-tts` and
  `audio_url` is filled in for you. See `spoken_text_for()` in the tool for the
  exact mapping of "what gets spoken" per type.
- **`highlight_incorrect_words` is special**: it needs a `spoken_text` field
  (the ORIGINAL correct passage, used for audio) that differs from the
  `transcript` field (the DISPLAYED version, with 2-4 words deliberately
  swapped at `incorrect_indices`). `spoken_text` is stripped automatically
  before the question is saved — it's an authoring-only field, not part of the
  live schema. **Verify your index math before merging** — split both texts on
  whitespace and confirm the differing word positions match `incorrect_indices`
  exactly (a one-line Python check; see git history for the exact snippet used
  when this type was first populated).

### Procedure
1. **Author** a JSON array of candidates (e.g. `.tmp/authored/<type>.json`).
2. **Dry-run** (validates only — does NOT touch the bank or synthesize audio):
   ```
   backend/venv/Scripts/python.exe tools/generate_questions.py \
     --type <type> --from-file .tmp/authored/<type>.json --out .tmp/validated
   ```
3. **Review** the output JSON for correctness, ambiguity, and naturalness.
4. **Merge for real** (validates + dedupes + assigns ids + synthesizes audio if
   needed + appends):
   ```
   backend/venv/Scripts/python.exe tools/generate_questions.py \
     --type <type> --from-file .tmp/authored/<type>.json
   ```
5. **Smoke test**: start the backend and open the type in Practice mode —
   confirm it renders, the audio plays and matches the displayed text (or
   deliberately doesn't, for `highlight_incorrect_words`), and scores without
   errors (the exam error boundary is a safety net either way).
6. **Deploy**: `git add backend/data/<section>.json backend/data/audio/*.mp3 && git commit && git push`
   (Render auto-redeploys the backend in ~2-3 min).

### Optional Gemini fallback
`--count N` generates via Gemini instead of `--from-file` (e.g. if hand-authoring
isn't convenient). Same validation/synthesis pipeline applies afterward. Per
`CLAUDE.md`, dry-run a small batch first (`--out`) since it's a paid call.

### How it stays correct
The tool validates every candidate against per-type invariants before
accepting it, e.g.:
- MCQ: `correct_answer`/`correct_answers` indices within range.
- Fill-blanks: `___BLANKn___` markers numbered `0..N-1`, answers within options.
- `grammar_drag_dialogue`: number of blanks == `len(correct_answers)`, and every
  answer is present in the `word_bank` (this exact invariant caused an earlier
  exam crash — now enforced at generation time).
- `fill_blanks_type_in`: blank markers match `correct_answers` length.
- `highlight_incorrect_words`: `incorrect_indices` within the transcript's word count.
- Word order / reorder: `correct_order` is a valid permutation.
Invalid or duplicate items are dropped (logged), so only clean questions land.

---

## Part 2 — `describe_image` photos (`tools/add_image_questions.py`)

`describe_image` needs a real photo, not generated content — generated
illustrations (the old `.svg` scenes) score poorly and don't look realistic.

### Procedure
1. Copy `.jpg`/`.jpeg`/`.png`/`.webp` files into `backend/data/images_incoming/`
   (gitignored working folder — only `.gitkeep` is tracked there).
2. Run:
   ```
   backend/venv/Scripts/python.exe tools/add_image_questions.py
   ```
   Each image is copied into `backend/data/audio/` (the existing media-serving
   folder, see `backend/routes/audio.py`) as `di_gen_NNN.<ext>`, registered as a
   new `describe_image` question in `backend/data/speaking.json` (no reference
   description needed — Gemini looks at the image directly when scoring), and
   the source file is moved to `images_incoming/processed/` so re-running the
   tool doesn't double-register it.
3. **Deploy**: `git add backend/data/speaking.json backend/data/audio/di_gen_*.* && git commit && git push`.

### Multimodal scoring
`backend/services/gemini_scoring.py` sends the image alongside the student's
recorded audio to Gemini for `describe_image`, explicitly asking it to check
whether the description matches what's actually shown (not just generic
fluency/quality). This only activates for real raster images (jpg/png/webp) —
older `.svg` describe_image questions still fall back to the old generic
instruction, since SVG isn't valid image input for the multimodal API.

---

## Self-improvement loop
- If a type frequently produces rejects, tighten its prompt/schema documentation
  or add clearer authored examples.
- If a new failure mode appears in rendering/scoring, add the invariant to
  `validate()` (text/audio tool) so it's caught before merging.

## Cost / performance notes
- `edge-tts` synthesis and hand-authored `--from-file` content: **free**, no API key.
- Gemini is used only for: (a) the optional `--count` generation fallback, and
  (b) scoring actual student responses (unchanged, always was).
- Recommended cadence: batches of 5-10 per type, reviewed, then merged.
