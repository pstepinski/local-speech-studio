from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Literal

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from stt_app.config import Settings
from stt_app.transcriber import AudioDecodeError, Transcriber, WhisperTranscriber

logger = logging.getLogger(__name__)


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    model: str


class PublicConfig(BaseModel):
    wake_phrase: str


def create_app(transcriber: Transcriber | None = None) -> FastAPI:
    settings = Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.transcriber = transcriber or await run_in_threadpool(
            WhisperTranscriber, settings
        )
        yield

    app = FastAPI(
        title="Whisper Large V3 Turbo REST STT",
        version="0.1.0",
        description="Local speech-to-text service powered by Whisper Large V3 Turbo.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health(request: Request) -> dict[str, str]:
        engine: Transcriber = request.app.state.transcriber
        return {
            "status": "ok",
            "model": engine.model_id,
            "device": engine.device,
        }

    @app.get("/config", response_model=PublicConfig)
    async def public_config() -> PublicConfig:
        return PublicConfig(wake_phrase=settings.wake_phrase)

    @app.post("/v1/transcriptions", response_model=TranscriptionResponse)
    async def transcribe(
        request: Request,
        file: Annotated[UploadFile, File(description="Audio file")],
        language: Annotated[Literal["auto", "pl", "en"], Form()] = "auto",
    ) -> TranscriptionResponse:
        limit = settings.max_upload_mb * 1024 * 1024
        audio = await file.read(limit + 1)
        if not audio:
            raise HTTPException(status_code=400, detail="audio file is empty")
        if len(audio) > limit:
            raise HTTPException(
                status_code=413,
                detail=f"audio file exceeds {settings.max_upload_mb} MB",
            )

        engine: Transcriber = request.app.state.transcriber
        try:
            text = await run_in_threadpool(engine.transcribe, audio, language)
        except AudioDecodeError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            logger.exception("Transcription failed")
            raise HTTPException(status_code=500, detail="transcription failed") from exc

        return TranscriptionResponse(
            text=text,
            language=language,
            model=engine.model_id,
        )

    return app


app = create_app()

