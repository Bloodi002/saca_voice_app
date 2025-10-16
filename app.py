from pathlib import Path
import json
import os
import uuid

from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from pipeline.pipeline import VoiceToTextPipeline
from saca_predictor import load_models, predict_from_text, questions

app = FastAPI(title="SACA Voice App")

RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)

# Serve static files (JS/CSS)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates folder
templates = Jinja2Templates(directory="templates")

# Load AI components
MODELS = load_models(base_dir="models")
VOICE_PIPE = VoiceToTextPipeline()  # Initialize speech-to-text pipeline

_KNOWN_AUDIO_EXTENSIONS = {".wav", ".webm", ".ogg", ".mp3", ".m4a", ".flac"}


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Render the SACA homepage."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(None),
    answers: str = Form(None),
    mode: str = Form("predict"),
    normalized_audio: str = Form(""),
):
    """Handle uploaded audio or form answers."""
    filename = None
    norm_text = normalized_audio.strip()
    raw_text = ""
    user_answers = []

    # === 1. Handle audio upload and transcription ===
    if file:
        incoming_name = file.filename or ""
        incoming_ext = os.path.splitext(incoming_name)[1].lower()
        safe_ext = incoming_ext if incoming_ext in _KNOWN_AUDIO_EXTENSIONS else ".wav"
        filename = f"{uuid.uuid4()}{safe_ext}"
        filepath = RESULTS_DIR / filename

        file_bytes = await file.read()
        filepath.write_bytes(file_bytes)

        try:
            raw_from_audio, norm_from_audio = VOICE_PIPE.process(str(filepath))
            raw_text = raw_from_audio
            if mode == "transcribe":
                return JSONResponse(
                    {
                        "raw_text": raw_from_audio,
                        "normalized_text": norm_from_audio,
                        "transcription": raw_from_audio,
                    }
                )
            norm_text = " ".join(
                part for part in [norm_text, norm_from_audio] if part
            ).strip()
        except Exception as exc:  # pragma: no cover - surfacing runtime issues
            return JSONResponse(
                {"error": f"ASR/Normalization failed: {exc}"},
                status_code=500,
            )

    # === 2. Handle typed answers ===
    if answers:
        try:
            data = json.loads(answers)
            user_answers = data.get("answers", [])
            text_from_form = " ".join(user_answers).strip()
            if text_from_form:
                _, text_norm = VOICE_PIPE.process_text(text_from_form)
                raw_text = " ".join(
                    part for part in [raw_text, text_from_form] if part
                ).strip()
                norm_text = " ".join(
                    part for part in [norm_text, text_norm] if part
                ).strip()
        except json.JSONDecodeError as exc:
            return JSONResponse(
                {"error": f"Failed to parse answers: {exc}"},
                status_code=400,
            )
        except Exception as exc:  # pragma: no cover - unexpected processing failure
            return JSONResponse(
                {"error": f"Failed to normalize answers: {exc}"},
                status_code=500,
            )

    if mode == "transcribe":
        # We should never reach here because we return earlier, but safeguard.
        return JSONResponse(
            {"error": "No speech detected during transcription."},
            status_code=400,
        )

    if not norm_text:
        return JSONResponse(
            {"error": "No speech or text detected. Please try again."},
            status_code=400,
        )

    # === 3. Predict with SACA model ===
    print("====================================")
    print("NORMALIZED TEXT SENT TO MODEL:")
    print(norm_text)
    print("====================================")

    saca_result = predict_from_text(norm_text, MODELS)

    parts = saca_result.split("\n")
    severity_line = (
        parts[2] if len(parts) >= 3 else (parts[-1] if parts else "")
    )

    return JSONResponse(
        {
            "result": saca_result,
            "raw_text": raw_text,
            "normalized_text": norm_text,
            "severity": severity_line,
            "questions": questions,
            "user_answers": user_answers,
            "download": filename,
        }
    )


@app.get("/download/{file_name}")
async def download_file(file_name: str):
    """Download previously uploaded file."""
    filepath = RESULTS_DIR / file_name
    if filepath.exists():
        return FileResponse(filepath, filename=file_name)
    return JSONResponse({"error": "File not found"}, status_code=404)
