# ============================================================
# ≡ƒºá SACA Predictor (Hybrid Confidence-Boosted Final Version)
# ============================================================

import os
import re

import joblib
import numpy as np
import torch
from sentence_transformers import SentenceTransformer, util

try:
    import sklearn  # type: ignore
    _SKLEARN_IMPORT_ERROR = None
except (ModuleNotFoundError, ImportError) as exc:  # pragma: no cover - environment specific
    sklearn = None  # type: ignore
    _SKLEARN_IMPORT_ERROR = exc


# ------------------------------------------------------------
# 1∩╕ÅΓâú Load all models
# ------------------------------------------------------------
def load_models(base_dir="models"):
    if sklearn is None:
        missing = getattr(_SKLEARN_IMPORT_ERROR, "name", "scikit-learn")
        if isinstance(_SKLEARN_IMPORT_ERROR, ImportError) and "_check_build" in str(_SKLEARN_IMPORT_ERROR):
            details = (
                "Reinstall scikit-learn wheel with `pip install --upgrade --force-reinstall scikit-learn`.\n"
                "If you built from source, ensure C/C++ build tools are available."
            )
        else:
            details = "Install scikit-learn with `pip install scikit-learn`."
        raise RuntimeError(
            f"Unable to import scikit-learn because `{missing}` is missing. {details}"
        ) from _SKLEARN_IMPORT_ERROR

    models = {}

    # Core models
    models["tfidf"] = joblib.load(os.path.join(base_dir, "tfidf.pkl"))
    models["label_encoder"] = joblib.load(os.path.join(base_dir, "label_encoder.pkl"))
    models["disease_model"] = joblib.load(os.path.join(base_dir, "disease_model.pkl"))   # Calibrated LR
    models["xgb_model"] = joblib.load(os.path.join(base_dir, "combined_features.pkl"))   # XGBoost Ensemble

    # Severity + Vectorizer
    models["severity_model"] = joblib.load(os.path.join(base_dir, "severity_model.pkl"))
    models["severity_vectorizer"] = joblib.load(os.path.join(base_dir, "severity_vectorizer.pkl"))

    # Sentence-BERT semantic support
    device = "cuda" if torch.cuda.is_available() else "cpu"
    models["sentence_model"] = SentenceTransformer("all-MiniLM-L6-v2", device=device)

    # Reference embeddings and labels
    models["ref_embs"] = torch.load(os.path.join(base_dir, "guard_model.pkl"))
    models["ref_labels"] = joblib.load(os.path.join(base_dir, "ref_labels.pkl"))


    return models


# ------------------------------------------------------------
# 2∩╕ÅΓâú Text Preprocessing
# ------------------------------------------------------------
def clean_text(t):
    t = str(t).lower()
    replacements = {
        "sick": "ill", "throwing up": "vomiting", "tired": "fatigue",
        "pain in chest": "chest pain", "hard to breathe": "breathlessness",
        "difficulty breathing": "breathlessness", "weak": "fatigue",
        "nauseous": "vomiting", "shivering": "chills", "sore throat": "throat pain"
    }
    for k, v in replacements.items():
        t = t.replace(k, v)
    t = re.sub(r"[^a-z\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


# ------------------------------------------------------------
# 3∩╕ÅΓâú Predict Disease (Hybrid Logistic + XGB + Semantic)
# ------------------------------------------------------------
def predict_disease(user_text, models, blend_weights=(0.7, 0.2, 0.1)):
    tfidf = models["tfidf"]
    lr_model = models["disease_model"]
    xgb_model = models["xgb_model"]
    le = models["label_encoder"]
    sent_model = models["sentence_model"]
    ref_embs = models["ref_embs"]
    ref_labels = models["ref_labels"]

    text_input_clean = clean_text(user_text)
    tfidf_vec = tfidf.transform([text_input_clean])

    # Logistic & XGB probabilities
    lr_probs = lr_model.predict_proba(tfidf_vec)[0]
    xgb_probs = xgb_model.predict_proba(tfidf_vec)[0]
    blended = blend_weights[0]*lr_probs + blend_weights[1]*xgb_probs

    # Semantic cosine boost
    user_emb = sent_model.encode([text_input_clean], convert_to_tensor=True)
    cos_scores = util.pytorch_cos_sim(user_emb, ref_embs).cpu().numpy()[0]
    semantic_boost = blend_weights[2]*cos_scores.max()
    blended[np.argmax(blended)] += semantic_boost
    blended = np.clip(blended, 0, 1); blended /= blended.sum()

    # Top predictions
    top_index = np.argmax(blended)
    label = le.inverse_transform([top_index])[0]
    confidence = float(blended[top_index])
    top3_idx = blended.argsort()[-3:][::-1]
    top3 = [(le.inverse_transform([i])[0], float(blended[i])) for i in top3_idx]

    return f"≡ƒÆè Predicted disease: {label}", confidence, top3


# ------------------------------------------------------------
# 4∩╕ÅΓâú Predict severity (unchanged)
# ------------------------------------------------------------
def predict_severity(user_text, models):
    vec = models["severity_vectorizer"]
    model = models["severity_model"]
    features = vec.transform([user_text])
    probs = model.predict_proba(features)[0]

    levels = ["≡ƒƒó Mild", "≡ƒƒá Moderate", "≡ƒö┤ Severe"]
    base_idx = np.argmax(probs)
    base_conf = np.max(probs)
    base_level = levels[base_idx]
    text = user_text.lower()

    severe_words = [
        "severe", "unable", "extreme", "intense", "sharp", "crushing",
        "bleeding", "faint", "unbearable", "canΓÇÖt breathe", "difficulty breathing"
    ]
    moderate_words = [
        "moderate", "persistent", "ongoing", "strong", "increasing", "worsening",
        "painful", "nausea", "vomiting", "chills", "fatigue"
    ]
    mild_words = [
        "mild", "slight", "little", "minor", "light", "okay", "manageable",
        "better", "subsiding"
    ]

    boost = 0.0
    if any(w in text for w in severe_words):
        base_level = "≡ƒö┤ Severe"; boost += 0.25
    elif any(w in text for w in moderate_words):
        base_level = "≡ƒƒá Moderate"; boost += 0.15
    elif any(w in text for w in mild_words):
        base_level = "≡ƒƒó Mild"; boost -= 0.05

    if text.count(" and ") + text.count(",") >= 2:
        if base_level == "≡ƒƒó Mild":
            base_level = "≡ƒƒá Moderate"
        boost += 0.1

    recal_conf = min(1.0, base_conf + boost)
    return f"≡ƒöÑ Severity level: {base_level} (confidence: {recal_conf:.2f})", recal_conf


# ------------------------------------------------------------
# 5∩╕ÅΓâú Unified Pipeline (Guard removed for Hybrid model)
# ------------------------------------------------------------
def predict_from_text(norm_text, models):
    disease_out, disease_conf, top3 = predict_disease(norm_text, models)
    severity_out, severity_conf = predict_severity(norm_text, models)

    # Compose advice
    if "Mild" in severity_out:
        advice = "≡ƒ⌐║ Monitor symptoms and rest. Stay hydrated."
    elif "Moderate" in severity_out:
        advice = "ΓÜá Consider consulting a healthcare professional within 24 hours."
    else:
        advice = "≡ƒÜ¿ Seek immediate medical attention."

    # Format readable output
    top3_display = "\n".join([f"   - {lbl:<30} ({conf:.2f})" for lbl, conf in top3])
    return (
        f"{disease_out} (confidence: {disease_conf:.2f})\n"
        f"{severity_out} (confidence: {severity_conf:.2f})\n"
        f"Advice: {advice}\n\n"
        f"≡ƒöì Top 3 Predictions:\n{top3_display}"
    )


# ------------------------------------------------------------
# 6∩╕ÅΓâú Questions for UI flow (unchanged)
# ------------------------------------------------------------
questions = [
    {"text": "1∩╕ÅΓâú How are you feeling today?", "type": "text"},
    {"text": "2∩╕ÅΓâú How long have you been feeling this?", "type": "choice",
     "options": ["A few hours", "A day", "2ΓÇô3 days", "A week or more"]},
    {"text": "How bad is the issue?", "type": "choice", "options": ["Light", "Medium", "Severe"]},
    {"text": "3∩╕ÅΓâú Have you noticed any other symptoms?", "type": "choice",
     "options": ["Fever", "Nausea or vomiting", "Cough or breathing difficulty", "Diarrhea", "Chest pain or tightness", "Dizziness or fatigue", "None of these"]}
]


# ------------------------------------------------------------
# 7∩╕ÅΓâú Version & Diagnostics
# ------------------------------------------------------------
import sklearn
print("scikit-learn version:", sklearn.__version__)

from joblib import load
tfidf = load("models/tfidf.pkl")
print("TF-IDF vocab size:", len(tfidf.vocabulary_))

# Optional manual test
if __name__ == "__main__":
    MODELS = load_models()
    sample = "I have been having headaches and vomiting since morning."
    print("\n≡ƒº¬ Test Run\n", predict_from_text(sample, MODELS))

