from .asr_model import ASRModel
from .dialect_normalizer import DialectNormalizer


class VoiceToTextPipeline:
    """Pipeline that performs speech recognition and dialect normalization."""

    def __init__(self, asr_model_name="small", normalizer_config=None):
        self.asr = ASRModel(asr_model_name)
        normalizer_config = normalizer_config or {}
        self.normalizer = DialectNormalizer(**normalizer_config)

    def process(self, audio_path):
        """Process an audio file into raw and normalized text."""
        raw = self.asr.transcribe(audio_path)
        try:
            norm = self.normalizer.normalize(raw)
        except Exception:
            norm = raw
        return raw, norm

    def process_text(self, text):
        """Normalize given text only."""
        try:
            norm = self.normalizer.normalize(text)
        except Exception:
            norm = text
        return text, norm
