import os
from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

DATA_AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "audio")
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


@router.get("/audio/{filename}")
def get_audio(filename: str):
    """Serve audio files from data/audio/ or uploads/."""
    # Determine media type
    media_types = {".svg": "image/svg+xml", ".png": "image/png", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".webm": "audio/webm"}
    ext = os.path.splitext(filename)[1].lower()
    media_type = media_types.get(ext)

    # Check data/audio first
    filepath = os.path.join(DATA_AUDIO_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type=media_type)

    # Check uploads
    filepath = os.path.join(UPLOADS_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath)

    return {"error": "File not found"}
