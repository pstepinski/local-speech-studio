from __future__ import annotations

import io
import wave

import pytest
from fastapi.testclient import TestClient

from stt_app.main import create_app
from stt_app.transcriber import AudioDecodeError


class FakeTranscriber:
    device = "cuda:1"
    model_id = "openai/whisper-large-v3-turbo"

    def __init__(self) -> None:
        self.calls: list[tuple[bytes, str]] = []

    def transcribe(self, audio: bytes, language: str) -> str:
        self.calls.append((audio, language))
        return "To jest przykładowa transkrypcja."


def wav_bytes() -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16_000)
        wav_file.writeframes(b"\x00\x00" * 160)
    return output.getvalue()


def test_transcribes_uploaded_audio() -> None:
    transcriber = FakeTranscriber()
    audio = wav_bytes()

    with TestClient(create_app(transcriber)) as client:
        response = client.post(
            "/v1/transcriptions",
            files={"file": ("nagranie.wav", audio, "audio/wav")},
            data={"language": "pl"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "text": "To jest przykładowa transkrypcja.",
        "language": "pl",
        "model": "openai/whisper-large-v3-turbo",
    }
    assert transcriber.calls == [(audio, "pl")]


def test_health_reports_model_and_device() -> None:
    with TestClient(create_app(FakeTranscriber())) as client:
        response = client.get("/health")

    assert response.json() == {
        "status": "ok",
        "model": "openai/whisper-large-v3-turbo",
        "device": "cuda:1",
    }


def test_exposes_configured_wake_phrase() -> None:
    with TestClient(create_app(FakeTranscriber())) as client:
        response = client.get("/config")

    assert response.status_code == 200
    assert response.json() == {"wake_phrase": "OK Studio!"}


def test_rejects_empty_upload() -> None:
    with TestClient(create_app(FakeTranscriber())) as client:
        response = client.post(
            "/v1/transcriptions",
            files={"file": ("empty.wav", b"", "audio/wav")},
        )

    assert response.status_code == 400


def test_returns_bad_request_for_invalid_audio() -> None:
    class BrokenTranscriber(FakeTranscriber):
        def transcribe(self, audio: bytes, language: str) -> str:
            raise AudioDecodeError("Nie udało się odczytać pliku audio")

    with TestClient(create_app(BrokenTranscriber())) as client:
        response = client.post(
            "/v1/transcriptions",
            files={"file": ("invalid.wav", b"not audio", "audio/wav")},
        )

    assert response.status_code == 400
