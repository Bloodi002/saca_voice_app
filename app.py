from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os, uuid, json

from pipeline.pipeline import VoiceToTextPipeline
from saca_predictor import load_models, predict_from_text, questions

app = FastAPI(title="SACA Voice App")

RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Load components
MODELS = load_models(base_dir="models")
VOICE_PIPE = VoiceToTextPipeline()


# === Helper ===
def normalize_free_text(text: str) -> str:
    """Normalize only free-text portions."""
    _, normalized = VOICE_PIPE.process_text(text)
    return normalized.strip().capitalize()


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Render homepage."""
    return templates.TemplateResponse("index.html", {"request": request})


# 🎤 STEP 1: Upload and transcribe audio only
@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """Transcribe voice to text and return normalized free text."""
    filename = f"{uuid.uuid4()}.wav"
    filepath = os.path.join(RESULTS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(await file.read())

    try:
        raw_text, free_text = VOICE_PIPE.process(filepath)
        norm_text = normalize_free_text(free_text)
        print(f"🎧 Transcribed: {raw_text}")
        print(f"🧠 Normalized: {norm_text}")

        # Return normalized text to prefill UI
        return JSONResponse({
            "raw_text": raw_text,
            "normalized_text": norm_text,
            "questions": questions
        })

    except Exception as e:
        return JSONResponse({"error": f"Audio processing failed: {e}"}, status_code=500)


# 🧩 STEP 2: Handle full structured submission
@app.post("/submit-answers")
async def submit_answers(answers: str = Form(...)):
    """Handle the structured answers after audio or text input."""
    try:
        data = json.loads(answers)
        user_answers = data.get("answers", [])

        free_text = user_answers[0] if len(user_answers) > 0 else ""
        duration = user_answers[1] if len(user_answers) > 1 else "N/A"
        severity = user_answers[2] if len(user_answers) > 2 else "N/A"
        other_symptoms = user_answers[3] if len(user_answers) > 3 else "N/A"
        change = user_answers[4] if len(user_answers) > 4 else "N/A"

        norm_text = normalize_free_text(free_text)

        formatted_text = (
            f"{norm_text}\n"
            f"Duration: {duration}\n"
            f"Severity: {severity}\n"
            f"Other symptoms: {other_symptoms}\n"
            f"Change: {change}"
        )

        print("====================================")
        print(f"🧩 FINAL FORMATTED TEXT SENT TO MODEL:\n{formatted_text}")
        print("====================================")

        saca_result = predict_from_text(formatted_text, MODELS)
        parts = saca_result.split("\n")
        severity_line = parts[2] if len(parts) >= 3 else parts[-1] if parts else ""

        return JSONResponse({
            "result": saca_result,
            "normalized_text": norm_text,
            "severity": severity_line,
            "questions": questions
        })

    except Exception as e:
        return JSONResponse({"error": f"Failed to process answers: {e}"}, status_code=500)
