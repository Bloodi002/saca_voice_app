import os
from difflib import get_close_matches
from typing import Dict

import pandas as pd
import spacy
from spacy.language import Language


class DialectNormalizer:
    def __init__(self, csv_path="assets/AE_plainEnglish_FinalTrainingPairs.csv"):
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Dialect mapping file not found at {csv_path}")

        self.nlp = self._load_spacy_model()
        df = pd.read_csv(csv_path)
        # Normalize keys once to simplify downstream lookups.
        self.mapping: Dict[str, str] = dict(
            zip(df["input"].str.lower(), df["target"].astype(str))
        )
        self._mapping_keys = list(self.mapping.keys())

    @staticmethod
    def _load_spacy_model() -> Language:
        """Load spaCy pipeline, falling back to a blank English model if needed."""
        try:
            return spacy.load("en_core_web_sm")
        except OSError:
            try:
                import en_core_web_sm  # type: ignore

                return en_core_web_sm.load()  # pragma: no cover - depends on optional pkg
            except Exception:
                return spacy.blank("en")

    def normalize(self, text: str) -> str:
        """Normalize Aboriginal English to plain English."""
        if not text:
            return ""

        text = text.lower()

        # Direct phrase replacement
        for k, v in self.mapping.items():
            if k in text:
                text = text.replace(k, v.lower())

        # Token-based fuzzy matching
        doc = self.nlp(text)
        out = []
        for token in doc:
            match = get_close_matches(token.text, self._mapping_keys, n=1, cutoff=0.85)
            if match:
                out.append(self.mapping[match[0]])
            else:
                out.append(token.text)
        return " ".join(out)
