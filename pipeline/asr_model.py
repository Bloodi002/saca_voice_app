import os
import tempfile

from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError

try:
    import whisper  # type: ignore
    _WHISPER_IMPORT_ERROR = None
except (ModuleNotFoundError, ImportError) as exc:  # pragma: no cover - depends on install
    whisper = None  # type: ignore
    _WHISPER_IMPORT_ERROR = exc


class ASRModel:
    def __init__(self, model_name="small"):
        if whisper is None:
            missing = getattr(_WHISPER_IMPORT_ERROR, "name", "whisper")
            if missing == "_imaging":
                details = "Reinstall Pillow with `pip install --upgrade --force-reinstall pillow`."
            elif missing == "numba":
                details = "Install Whisper dependencies with `pip install openai-whisper numba`."
            else:
                details = "Install Whisper with `pip install openai-whisper`."
            raise RuntimeError(
                f"Unable to import Whisper because `{missing}` is missing. {details}"
            ) from _WHISPER_IMPORT_ERROR
        # Load Whisper model once
        self.model = whisper.load_model(model_name)

    def _to_wav(self, path):
        """Converts any audio file into a temporary WAV file if needed."""
        ext = os.path.splitext(path)[1].lower()
        if ext == ".wav":
            return path
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        try:
            audio = AudioSegment.from_file(path)
            audio = audio.set_frame_rate(16000)
            audio = audio.set_channels(1)
            audio.export(tmp.name, format="wav")
            return tmp.name
        except CouldntDecodeError as exc:
            try:
                os.remove(tmp.name)
            except FileNotFoundError:
                pass
            raise RuntimeError(
                "Unsupported audio format. Please ensure FFmpeg is installed and the file is not corrupted."
            ) from exc
        except Exception:
            try:
                os.remove(tmp.name)
            except FileNotFoundError:
                pass
            raise

    def transcribe(self, audio_path: str) -> str:
        """Transcribe speech to text using Whisper."""
        wav = self._to_wav(audio_path)
        result = self.model.transcribe(wav, fp16=False)
        text = result.get("text", "").strip()
        if wav != audio_path:
            os.remove(wav)
        return text
