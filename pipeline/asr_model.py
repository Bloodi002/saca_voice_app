import whisper, tempfile, os
from pydub import AudioSegment

class ASRModel:
    def __init__(self, model_name="small"):
        self.model = whisper.load_model(model_name)

    def _to_wav(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext == ".wav":
            return path
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        audio = AudioSegment.from_file(path)
        audio = audio.set_channels(1)
        audio.export(tmp.name, format="wav")
        return tmp.name

    def transcribe(self, audio_path: str) -> str:
        wav = self._to_wav(audio_path)
        result = self.model.transcribe(wav, fp16=False)
        text = result.get("text", "")
        if wav != audio_path:
            os.remove(wav)
        return text
