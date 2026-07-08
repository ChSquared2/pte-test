#!/usr/bin/env python3
"""Register real photos as describe_image questions.

Workflow:
  1. Copy image files (.jpg/.jpeg/.png/.webp) into backend/data/images_incoming/
  2. Run: python tools/add_image_questions.py
  3. Each image is copied into backend/data/audio/ (the existing media-serving
     folder — see backend/routes/audio.py), registered as a new describe_image
     question in backend/data/speaking.json, and the source file is moved to
     backend/data/images_incoming/processed/ so reruns don't double-register it.

No reference description is needed: Gemini looks at the image directly when
scoring the student's recorded response (see backend/services/gemini_scoring.py).
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_questions import DATA_DIR, AUDIO_DIR, all_existing_ids, _read  # noqa: E402

INCOMING_DIR = os.path.join(DATA_DIR, "images_incoming")
PROCESSED_DIR = os.path.join(INCOMING_DIR, "processed")
SPEAKING_PATH = os.path.join(DATA_DIR, "speaking.json")

VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

DEFAULTS = {"time_limit_seconds": 40, "prep_time": 25, "record_time": 40}


def next_image_ids(n, taken):
    ids, i = [], 1
    while len(ids) < n:
        cand = f"di_gen_{i:03d}"
        if cand not in taken:
            ids.append(cand)
            taken.add(cand)
        i += 1
    return ids


def main():
    os.makedirs(INCOMING_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(AUDIO_DIR, exist_ok=True)

    files = sorted(
        f for f in os.listdir(INCOMING_DIR)
        if os.path.isfile(os.path.join(INCOMING_DIR, f))
        and os.path.splitext(f)[1].lower() in VALID_EXTS
    )
    if not files:
        print(f"No new images found in {INCOMING_DIR}.")
        print("Copy .jpg/.jpeg/.png/.webp files there and re-run.")
        return

    existing_ids = all_existing_ids()
    ids = next_image_ids(len(files), existing_ids)

    bank = _read(SPEAKING_PATH)
    bank.setdefault("describe_image", [])

    added = []
    for filename, qid in zip(files, ids):
        ext = os.path.splitext(filename)[1].lower()
        dest_filename = f"{qid}{ext}"
        src = os.path.join(INCOMING_DIR, filename)
        dest = os.path.join(AUDIO_DIR, dest_filename)
        shutil.copy2(src, dest)

        question = {
            "id": qid,
            "type": "describe_image",
            "section": "speaking",
            "image_url": f"/api/audio/{dest_filename}",
            **DEFAULTS,
        }
        bank["describe_image"].append(question)
        added.append((filename, qid))

        shutil.move(src, os.path.join(PROCESSED_DIR, filename))

    with open(SPEAKING_PATH, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)

    print(f"Registered {len(added)} describe_image question(s):")
    for filename, qid in added:
        print(f"  {filename} -> {qid}")
    print(f"Appended to {SPEAKING_PATH}. Commit + push to deploy.")


if __name__ == "__main__":
    main()
