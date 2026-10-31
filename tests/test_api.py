from __future__ import annotations

import io
import wave

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def silent_wav() -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(24_000)
        wav_file.writeframes(b"\x00\x00" * 240)
    return output.getvalue()


class FakeSynthesizer:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    def synthesize(self, text: str, language: str) -> bytes:
        self.calls.append((text, language))
        return silent_wav()


@pytest.mark.parametrize(
    ("text", "language"),
    [
        ("Cześć! To jest test polskiego lektora.", "pl"),
        ("Hello! This is a test of the English narrator.", "en"),
    ],
)
def test_generates_wav_for_polish_and_english(text: str, language: str) -> None:
    synthesizer = FakeSynthesizer()

    with TestClient(create_app(synthesizer)) as client:
        response = client.post(
            "/v1/speech", json={"text": text, "language": language}
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.content.startswith(b"RIFF")
    assert synthesizer.calls == [(text, language)]


def test_rejects_unsupported_language() -> None:
    with TestClient(create_app(FakeSynthesizer())) as client:
        response = client.post(
            "/v1/speech", json={"text": "Test", "language": "xx"}
        )

    assert response.status_code == 422


def test_rejects_blank_text() -> None:
    with TestClient(create_app(FakeSynthesizer())) as client:
        response = client.post(
            "/v1/speech", json={"text": "   ", "language": "pl"}
        )

    assert response.status_code == 422

