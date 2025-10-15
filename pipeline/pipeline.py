from .asr_model import ASRModel
from .dialect_normalizer import DialectNormalizer


class VoiceToTextPipeline:
    """Pipeline that performs speech recognition and dialect normalization."""

    def __init__(self, asr_model_name="small"):
        self.asr = ASRModel(asr_model_name)
        self.normalizer = DialectNormalizer()

    def process(self, audio_path):
        """Process an audio file into raw and normalized text."""
        raw = self.asr.transcribe(audio_path)
        norm = self.normalizer.normalize(raw)
        return raw, norm

    def process_text(self, text):
        """Normalize given text only."""
        norm = self.normalizer.normalize(text)
        return text, norm
