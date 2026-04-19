# Run PTE Academic Simulator

## Prerequisites
- Node.js installed
- Python 3.10+ installed
- `.env` with `GOOGLE_API_KEY` set

## Start Backend

```bash
cd backend
source venv/Scripts/activate   # Windows: venv\Scripts\activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Note: Run uvicorn from the project root (`pte-test/`), not from inside `backend/`.

```bash
cd pte-test
source backend/venv/Scripts/activate
python -m uvicorn backend.main:app --reload --port 8000
```

## Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:5173
Backend API runs on http://localhost:8000

## Usage

- **Practice Mode** (`/practice`): Select a section tab, choose a question type, answer questions
- **Exam Mode** (`/exam`): Full exam simulation with timers and sequential navigation
- **Dashboard** (`/dashboard`): View progress, scores, and diagnostics

## Audio Files

Speaking and Listening questions reference audio files in `backend/data/audio/`.
For testing without real audio files, those question types will show audio players but won't play.
To add audio, place `.mp3` files in `backend/data/audio/` matching the filenames in the JSON question banks.

## Question Banks

Question data is in `backend/data/`:
- `reading.json` - 5 question types, 15+ questions
- `writing.json` - Essay + Summarize Written Text
- `speaking.json` - 7 question types
- `listening.json` - 8 question types

Add more questions by following the existing JSON schema in each file.
