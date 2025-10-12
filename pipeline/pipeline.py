from .asr_model import ASRModel
from .dialect_normalizer import DialectNormalizer

class VoiceToTextPipeline:
    def __init__(self, asr_model_name="small"):
        self.asr = ASRModel(asr_model_name)
        self.normalizer = DialectNormalizer()

    def process(self, audio_path):
        raw = self.asr.transcribe(audio_path)
        norm = self.normalizer.normalize(raw)
        return raw, norm

    def process_text(self, text):
        norm = self.normalizer.normalize(text)
        return text, norm
