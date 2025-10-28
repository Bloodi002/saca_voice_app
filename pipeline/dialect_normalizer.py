import os
from difflib import get_close_matches
from typing import Dict

import pandas as pd
import spacy
from spacy.language import Language


class DialectNormalizer:
    def __init__(
        self,
        csv_path="assets/AE_plainEnglish_FinalTrainingPairs.csv",
        input_column="input",
        target_column="target",
        lowercase=True,
        swap_columns=False,
        fuzzy_cutoff=0.85,
    ):
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Dialect mapping file not found at {csv_path}")

        self.nlp = self._load_spacy_model()
        df = pd.read_csv(csv_path)

        if swap_columns:
            input_column, target_column = target_column, input_column

        if input_column not in df.columns or target_column not in df.columns:
            raise KeyError(
                f"Expected columns '{input_column}' and '{target_column}' in {csv_path}"
            )

        inputs = df[input_column].astype(str)
        outputs = df[target_column].astype(str)

        self._lowercase = lowercase
        self._fuzzy_cutoff = fuzzy_cutoff
        if lowercase:
            inputs = inputs.str.lower()

        # Normalize keys once to simplify downstream lookups.
        self.mapping: Dict[str, str] = dict(zip(inputs, outputs))
        self._mapping_keys = list(self.mapping.keys())
        self._split_mapping: Dict[str, str] = {}
        for key, value in self.mapping.items():
            if not key:
                continue
            parts = key.split()
            if len(parts) <= 1:
                continue
            for part in parts:
                token_key = part if not lowercase else part.lower()
                if token_key and token_key not in self.mapping and token_key not in self._split_mapping:
                    self._split_mapping[token_key] = value

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

        working = text.lower() if self._lowercase else text

        # Direct phrase replacement
        for k, v in self.mapping.items():
            if k in working:
                working = working.replace(k, v)

        # Token-based fuzzy matching
        doc = self.nlp(working)
        out = []
        for token in doc:
            token_text = token.text.lower() if self._lowercase else token.text
            match = get_close_matches(
                token_text, self._mapping_keys, n=1, cutoff=self._fuzzy_cutoff
            )
            if match:
                out.append(self.mapping[match[0]])
            elif token_text in self._split_mapping:
                out.append(self._split_mapping[token_text])
            else:
                out.append(token.text)
        normalized = " ".join(out)
        return normalized
