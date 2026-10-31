from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True, slots=True)
class Settings:
    device: str = "auto"
    voice_prompt_path: str | None = None

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        return cls(
            device=os.getenv("CHATTERBOX_DEVICE", "auto").lower(),
            voice_prompt_path=os.getenv("CHATTERBOX_VOICE_PROMPT") or None,
        )

