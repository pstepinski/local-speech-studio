from __future__ import annotations

import subprocess
import threading
from typing import Protocol

import numpy as np

from stt_app.config import Settings


LANGUAGE_NAMES = {
    "pl": "polish",
    "en": "english",
}


class Transcriber(Protocol):
    device: str
    model_id: str

    def transcribe(self, audio: bytes, language: str) -> str: ...


class AudioDecodeError(ValueError):
    pass


def decode_audio(audio: bytes) -> np.ndarray:
    """Decode common browser/audio formats to mono 16 kHz float32 with FFmpeg."""
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                "pipe:0",
                "-f",
                "f32le",
                "-ac",
                "1",
                "-ar",
                "16000",
                "pipe:1",
            ],
            input=audio,
            capture_output=True,
            check=True,
            timeout=120,
        )
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        raise AudioDecodeError("Nie udało się odczytać pliku audio") from exc

    samples = np.frombuffer(result.stdout, dtype=np.float32).copy()
    if samples.size == 0:
        raise AudioDecodeError("Plik audio jest pusty")
    return samples


class WhisperTranscriber:
    def __init__(self, settings: Settings) -> None:
        import torch
        from transformers import (
            AutoModelForSpeechSeq2Seq,
            AutoProcessor,
            pipeline,
        )

        device = settings.device
        if device == "auto":
            if torch.cuda.is_available():
                device = "cuda:1" if torch.cuda.device_count() > 1 else "cuda:0"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

        if device.startswith("cuda"):
            index = int(device.partition(":")[2] or "0")
            if not torch.cuda.is_available() or index >= torch.cuda.device_count():
                raise RuntimeError(f"Urządzenie {device} nie jest dostępne")
            dtype = torch.float16
        else:
            dtype = torch.float32

        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            settings.model_id,
            dtype=dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True,
            attn_implementation="sdpa",
        ).to(device)
        processor = AutoProcessor.from_pretrained(settings.model_id)

        self._pipeline = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            chunk_length_s=30,
            batch_size=1,
            dtype=dtype,
            device=device,
            ignore_warning=True,
        )
        self._lock = threading.Lock()
        self.device = device
        self.model_id = settings.model_id

    def transcribe(self, audio: bytes, language: str) -> str:
        samples = decode_audio(audio)
        generate_kwargs: dict[str, str] = {"task": "transcribe"}
        if language != "auto":
            generate_kwargs["language"] = LANGUAGE_NAMES[language]

        with self._lock:
            result = self._pipeline(
                {"array": samples, "sampling_rate": 16_000},
                generate_kwargs=generate_kwargs,
            )
        return str(result["text"]).strip()

