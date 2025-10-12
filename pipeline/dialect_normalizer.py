import pandas as pd, spacy, os
from difflib import get_close_matches

class DialectNormalizer:
    def __init__(self, csv_path="assets/AE_plainEnglish_FinalTrainingPairs.csv"):
        self.nlp = spacy.load("en_core_web_sm")
        df = pd.read_csv(csv_path)
        self.mapping = dict(zip(df["input"].str.lower(), df["target"]))

    def normalize(self, text):
        text = text.lower()
        for k, v in self.mapping.items():
            if k in text:
                text = text.replace(k, v.lower())
        doc = self.nlp(text)
        out = []
        for token in doc:
            match = get_close_matches(token.text, self.mapping.keys(), n=1, cutoff=0.85)
            if match:
                out.append(self.mapping[match[0]])
            else:
                out.append(token.text)
        return " ".join(out)
