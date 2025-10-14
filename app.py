from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os, uuid, json
from saca_predictor import load_models, predict_from_text, questions

app = FastAPI()

RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

# Serve static files (JS/CSS/images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates folder for HTML
templates = Jinja2Templates(directory="templates")

# Load SACA models once
MODELS = load_models(base_dir="models")

# Root endpoint: serve HTML
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/upload-audio")
@app.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(None),  # optional now
    answers: str = Form(None)
):
    filename = None
    if file:
        # Save audio if provided
        filename = f"{uuid.uuid4()}.wav"
        filepath = os.path.join(RESULTS_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(await file.read())

    # Prepare normalized text from answers
    norm_text = ""
    user_answers = []

    if answers:
        try:
            data = json.loads(answers)
            user_answers = data.get("answers", [])
            # Combine questions and answers for SACA predictor
            norm_text = " ".join(user_answers).strip()
        except Exception as e:
            return JSONResponse({"error": f"Failed to parse answers: {e}"}, status_code=400)
    else:
        # If no answers, fallback text
        norm_text = "No answers provided."
        user_answers = []

    # Run SACA prediction
    print("====================================")
    print(f"🧠 NORMALIZED TEXT SENT TO MODEL:\n{norm_text}")
    print("====================================")

    saca_result = predict_from_text(norm_text, MODELS)
    severity_line = saca_result.split("\n")[2] if len(saca_result.split("\n")) >= 3 else ""

    return JSONResponse({
        "result": saca_result,
        "nlp_text": norm_text,
        "severity": severity_line,
        "questions": questions,
        "user_answers": user_answers,
        "download": filename
    })



@app.get("/download/{file_name}")
async def download_file(file_name: str):
    filepath = os.path.join(RESULTS_DIR, file_name)
    if os.path.exists(filepath):
        return FileResponse(filepath, filename=file_name)
    return JSONResponse({"error": "File not found"}, status_code=404)
