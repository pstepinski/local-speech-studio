from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True, slots=True)
class Settings:
    model_id: str = "openai/whisper-large-v3-turbo"
    device: str = "auto"
    max_upload_mb: int = 100
    wake_phrase: str = "OK Studio!"

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        return cls(
            model_id=os.getenv(
                "WHISPER_MODEL_ID", "openai/whisper-large-v3-turbo"
            ),
            device=os.getenv("WHISPER_DEVICE", "auto").lower(),
            max_upload_mb=int(os.getenv("WHISPER_MAX_UPLOAD_MB", "100")),
            wake_phrase=os.getenv("WHISPER_WAKE_PHRASE", "OK Studio!").strip(),
        )

