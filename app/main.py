from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import Settings
from app.schemas import SUPPORTED_LANGUAGES, SpeechRequest
from app.tts import ChatterboxSynthesizer, Synthesizer

logger = logging.getLogger(__name__)


def create_app(synthesizer: Synthesizer | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.synthesizer = synthesizer or await run_in_threadpool(
            ChatterboxSynthesizer, Settings.from_env()
        )
        yield

    app = FastAPI(
        title="Chatterbox REST TTS",
        version="0.1.0",
        description="Local multilingual speech synthesis with Chatterbox Multilingual.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/languages")
    async def languages() -> dict[str, list[str]]:
        return {"languages": sorted(SUPPORTED_LANGUAGES)}

    @app.post(
        "/v1/speech",
        response_class=Response,
        responses={200: {"content": {"audio/wav": {}}}},
    )
    async def speech(payload: SpeechRequest, request: Request) -> Response:
        engine: Synthesizer = request.app.state.synthesizer
        try:
            wav = await run_in_threadpool(
                engine.synthesize, payload.text, payload.language
            )
        except Exception as exc:
            logger.exception("Speech synthesis failed")
            raise HTTPException(status_code=500, detail="speech synthesis failed") from exc

        return Response(
            content=wav,
            media_type="audio/wav",
            headers={"Content-Disposition": 'attachment; filename="speech.wav"'},
        )

    return app


app = create_app()

