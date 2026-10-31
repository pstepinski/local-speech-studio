from pydantic import BaseModel, Field, field_validator


SUPPORTED_LANGUAGES = frozenset(
    {
        "ar",
        "da",
        "de",
        "el",
        "en",
        "es",
        "fi",
        "fr",
        "he",
        "hi",
        "it",
        "ja",
        "ko",
        "ms",
        "nl",
        "no",
        "pl",
        "pt",
        "ru",
        "sv",
        "sw",
        "tr",
        "zh",
    }
)


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5_000)
    language: str = Field(description="ISO 639-1 language code, for example 'pl' or 'en'")

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text must not be blank")
        return value

    @field_validator("language")
    @classmethod
    def language_must_be_supported(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in SUPPORTED_LANGUAGES:
            supported = ", ".join(sorted(SUPPORTED_LANGUAGES))
            raise ValueError(f"unsupported language; supported values: {supported}")
        return value

