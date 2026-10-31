from __future__ import annotations

import io
import re
import threading
import wave
from typing import Protocol

from app.config import Settings


class Synthesizer(Protocol):
    def synthesize(self, text: str, language: str) -> bytes: ...


def split_text(text: str, max_chars: int = 220) -> list[str]:
    """Split prose into model-sized chunks, preferring paragraph and sentence ends."""
    if max_chars < 20:
        raise ValueError("max_chars must be at least 20")

    sentences: list[str] = []
    for paragraph in re.split(r"\n\s*\n", text.strip()):
        normalized = " ".join(paragraph.split())
        if not normalized:
            continue
        sentences.extend(re.split(r"(?<=[.!?…])\s+", normalized))

    pieces: list[str] = []
    for sentence in sentences:
        sentence = sentence.strip()
        while len(sentence) > max_chars:
            boundary = sentence.rfind(" ", 0, max_chars + 1)
            if boundary < 1:
                boundary = max_chars
            pieces.append(sentence[:boundary].strip())
            sentence = sentence[boundary:].strip()
        if sentence:
            pieces.append(sentence)

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        candidate = f"{current} {piece}".strip()
        if current and len(candidate) > max_chars:
            chunks.append(current)
            current = piece
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def tensor_to_wav(audio: object, sample_rate: int) -> bytes:
    """Encode a Chatterbox float tensor shaped [channels, samples] as PCM WAV."""
    import torch

    if not isinstance(audio, torch.Tensor):
        raise TypeError("Chatterbox returned an unsupported audio value")

    samples = audio.detach().cpu()
    if samples.ndim == 1:
        samples = samples.unsqueeze(0)
    if samples.ndim != 2:
        raise ValueError("Chatterbox returned audio with an unexpected shape")

    pcm = samples.clamp(-1, 1).mul(32767).to(torch.int16)
    interleaved = pcm.transpose(0, 1).contiguous().numpy().tobytes()

    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(pcm.shape[0])
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(interleaved)
    return output.getvalue()


class ChatterboxSynthesizer:
    """Thread-safe adapter around the locally loaded Chatterbox model."""

    def __init__(self, settings: Settings) -> None:
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS

        device = settings.device
        if device == "auto":
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

        self._model = ChatterboxMultilingualTTS.from_pretrained(device=device)
        self._voice_prompt_path = settings.voice_prompt_path
        self._device = device
        self._lock = threading.Lock()

    def synthesize(self, text: str, language: str) -> bytes:
        import torch

        arguments: dict[str, object] = {"language_id": language}
        if self._voice_prompt_path:
            arguments["audio_prompt_path"] = self._voice_prompt_path

        # The model is shared between requests and is not guaranteed to be thread-safe.
        with self._lock:
            generated: list[torch.Tensor] = []
            try:
                for chunk in split_text(text):
                    audio = self._model.generate(chunk, **arguments)
                    if audio.ndim == 1:
                        audio = audio.unsqueeze(0)
                    generated.append(audio.detach().cpu())
                    del audio
                    if self._device == "cuda":
                        torch.cuda.empty_cache()
            except Exception:
                if self._device == "cuda":
                    torch.cuda.empty_cache()
                raise

        if not generated:
            raise ValueError("No text to synthesize")

        pause = torch.zeros(
            (generated[0].shape[0], int(self._model.sr * 0.18)),
            dtype=generated[0].dtype,
        )
        parts: list[torch.Tensor] = []
        for index, chunk_audio in enumerate(generated):
            if index:
                parts.append(pause)
            parts.append(chunk_audio)
        audio = torch.cat(parts, dim=1)
        return tensor_to_wav(audio, self._model.sr)

