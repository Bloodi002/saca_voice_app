# ============================================================
# 🧠 SACA Predictor (Final Stable Version)
# ============================================================

import os
import numpy as np
import joblib
from sentence_transformers import SentenceTransformer


# ------------------------------------------------------------
# 1️⃣ Load all models
# ------------------------------------------------------------
def load_models(base_dir="."):
    models = {}

    # --- Load pickle-based models
    models["guard_model"] = joblib.load(os.path.join(base_dir, "guard_model.pkl"))
    models["disease_model"] = joblib.load(os.path.join(base_dir, "disease_model.pkl"))
    models["severity_model"] = joblib.load(os.path.join(base_dir, "severity_model.pkl"))
    models["tfidf"] = joblib.load(os.path.join(base_dir, "tfidf.pkl"))
    models["severity_vectorizer"] = joblib.load(os.path.join(base_dir, "severity_vectorizer.pkl"))
    models["label_encoder"] = joblib.load(os.path.join(base_dir, "label_encoder.pkl"))
    return models



# ------------------------------------------------------------
# 2️⃣ Predict whether user input is a symptom
# ------------------------------------------------------------
def predict_guard(user_text, models):
    tfidf = models["tfidf"]
    guard = models["guard_model"]
    sent_model = models.get("sentence_model", None)

    features = tfidf.transform([user_text])
    expected = guard.get_booster().num_features()
    actual = features.shape[1]

    # Handle mismatch between TF-IDF and model
    if actual != expected:
        fixed = np.zeros((1, expected))
        fixed[:, :min(expected, actual)] = features.toarray()[:, :min(expected, actual)]
        features = fixed

    base_prob = guard.predict_proba(features)[0][1]

    # Default similarity in case sentence_model fails
    sim = 0.0

    # Try semantic similarity if sentence_model exists
    if sent_model is not None:
        try:
            symptom_refs = [
                "I have pain", "I feel dizzy", "I have a fever", "I am vomiting",
                "My throat hurts", "I have chest pain", "I feel weak", "I am coughing"
            ]
            ref_emb = sent_model.encode(symptom_refs)
            user_emb = sent_model.encode([user_text])
            sim = np.max(
                np.dot(ref_emb, user_emb.T)
                / (np.linalg.norm(ref_emb, axis=1)[:, None] * np.linalg.norm(user_emb))
            )
        except Exception as e:
            print(f"⚠️ Sentence model similarity failed: {e}")
            sim = 0.0

    # Keyword boost
    medical_keywords = [
        "pain", "hurt", "ache", "fever", "vomit", "bleed", "rash", "cough",
        "nausea", "dizzy", "throat", "tired", "chest", "infection", "cramp",
        "sore", "weak", "burning", "itch", "swelling"
    ]
    num_kw = sum(kw in user_text.lower() for kw in medical_keywords)
    keyword_boost = min(num_kw * 0.05, 0.25)

    # Weighted combination
    prob = 0.6 * base_prob + 0.3 * sim + 0.1 * keyword_boost

    # Filter out greetings or too-short texts
    common_words = ["hello", "hi", "morning", "hey", "thanks", "okay"]
    if len(user_text.split()) < 3 or any(w in user_text.lower() for w in common_words):
        prob -= 0.35

    prob = np.clip(prob, 0, 1)

    if prob >= 0.55:
        label = "Symptom"
    elif prob >= 0.45:
        label = "Uncertain"
    else:
        label = "Non-symptom"

    return label, round(float(prob), 3)



# ------------------------------------------------------------
# 3️⃣ Predict disease
# ------------------------------------------------------------
def predict_disease(user_text, models):
    tfidf = models["tfidf"]
    model = models["disease_model"]
    le = models["label_encoder"]

    features = tfidf.transform([user_text])
    pred = model.predict_proba(features)[0]
    label_index = np.argmax(pred)
    label = le.inverse_transform([label_index])[0]
    confidence = np.max(pred)
    return f"💊 Predicted disease: {label}", confidence


# ------------------------------------------------------------
# 4️⃣ Predict severity
# ------------------------------------------------------------
def predict_severity(user_text, models):
    vec = models["severity_vectorizer"]
    model = models["severity_model"]
    features = vec.transform([user_text])
    probs = model.predict_proba(features)[0]

    levels = ["🟢 Mild", "🟠 Moderate", "🔴 Severe"]
    base_idx = np.argmax(probs)
    base_conf = np.max(probs)
    base_level = levels[base_idx]
    text = user_text.lower()

    severe_words = [
        "severe", "unable", "extreme", "intense", "sharp", "crushing",
        "bleeding", "faint", "unbearable", "can’t breathe", "difficulty breathing"
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
        base_level = "🔴 Severe"
        boost += 0.25
    elif any(w in text for w in moderate_words):
        base_level = "🟠 Moderate"
        boost += 0.15
    elif any(w in text for w in mild_words):
        base_level = "🟢 Mild"
        boost -= 0.05

    if text.count(" and ") + text.count(",") >= 2:
        if base_level == "🟢 Mild":
            base_level = "🟠 Moderate"
        boost += 0.1

    recal_conf = min(1.0, base_conf + boost)
    return f"🔥 Severity level: {base_level} (confidence: {recal_conf:.2f})", recal_conf


# ------------------------------------------------------------
# 5️⃣ Unified pipeline
# ------------------------------------------------------------
def predict_from_text(norm_text, models):
    guard_label, guard_prob = predict_guard(norm_text, models)
    disease_out, disease_conf = predict_disease(norm_text, models)
    severity_out, severity_conf = predict_severity(norm_text, models)

    symptom_status = ""
    if guard_label == "Non-symptom":
        symptom_status = f"💬 Non-symptom (confidence: {guard_prob:.2f}) — may not be medical."
    elif guard_label == "Uncertain":
        symptom_status = f"🤔 Uncertain (confidence: {guard_prob:.2f}) — please clarify."
    else:
        symptom_status = f"✅ Symptom detected (confidence: {guard_prob:.2f})"

    # Add advice based on severity
    if "Mild" in severity_out:
        advice = "🩺 Monitor symptoms and rest. Stay hydrated."
    elif "Moderate" in severity_out:
        advice = "⚠ Consider consulting a healthcare professional within 24 hours."
    else:
        advice = "🚨 Seek immediate medical attention."

    return (
        f"{symptom_status}\n"
        f"{disease_out} (confidence: {disease_conf:.2f})\n"
        f"{severity_out} (confidence: {severity_conf:.2f})\n"
        f"Advice: {advice}"
    )
questions = [
    {"text": "1️⃣ How are you feeling today?", "type": "text"},
    {"text": "2️⃣ How long have you been feeling this?", "type": "choice",
     "options": ["A few hours", "A day", "2–3 days", "A week or more"]},
    {"text": "How bad is the issue?", "type": "choice", "options": ["Light", "Medium", "Severe"]},
    {"text": "3️⃣ Have you noticed any other symptoms?", "type": "choice",
     "options": ["Fever", "Nausea or vomiting", "Cough or breathing difficulty", "Diarrhea", "Chest pain or tightness", "Dizziness or fatigue", "None of these"]},
    {"text": "4️⃣ Does it get better or worse after any of these?", "type": "choice",
     "options": ["After eating", "When resting", "When moving or standing", "Changes randomly", "Not sure"]}
]
