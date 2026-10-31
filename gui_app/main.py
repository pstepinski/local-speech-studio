from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.background import BackgroundTask


PROXY_REQUEST_HEADERS_TO_SKIP = {"host", "content-length"}
PROXY_RESPONSE_HEADERS_TO_SKIP = {
    "connection",
    "content-encoding",
    "content-length",
    "transfer-encoding",
}


def env_bool(name: str, default: bool = True) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class GuiConfig(BaseModel):
    tts_url: str
    stt_url: str
    enable_tts: bool
    enable_stt: bool
    enable_continuous: bool


def load_config() -> GuiConfig:
    load_dotenv()
    enable_stt = env_bool("GUI_ENABLE_STT")
    return GuiConfig(
        tts_url=os.getenv(
            "GUI_TTS_UPSTREAM_URL",
            os.getenv("GUI_TTS_URL", "http://localhost:8000"),
        ).rstrip("/"),
        stt_url=os.getenv(
            "GUI_STT_UPSTREAM_URL",
            os.getenv("GUI_STT_URL", "http://localhost:8001"),
        ).rstrip("/"),
        enable_tts=env_bool("GUI_ENABLE_TTS"),
        enable_stt=enable_stt,
        enable_continuous=enable_stt and env_bool("GUI_ENABLE_CONTINUOUS"),
    )


def create_app(
    config: GuiConfig | None = None,
    proxy_transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    runtime_config = config or load_config()
    static_directory = Path(__file__).parents[1] / "app" / "static"

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with httpx.AsyncClient(
            timeout=None,
            transport=proxy_transport,
        ) as proxy_client:
            app.state.proxy_client = proxy_client
            yield

    app = FastAPI(
        title="Local Speech Studio GUI",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.mount("/static", StaticFiles(directory=static_directory), name="static")

    @app.get("/", include_in_schema=False, response_class=HTMLResponse)
    async def index() -> str:
        return (static_directory / "index.html").read_text(encoding="utf-8")

    @app.get("/favicon.ico", include_in_schema=False, response_class=Response)
    async def favicon() -> Response:
        return Response(
            content=(static_directory / "favicon.svg").read_bytes(),
            media_type="image/svg+xml",
        )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/config", response_model=GuiConfig)
    async def public_config() -> GuiConfig:
        return GuiConfig(
            tts_url="/api/tts",
            stt_url="/api/stt",
            enable_tts=runtime_config.enable_tts,
            enable_stt=runtime_config.enable_stt,
            enable_continuous=runtime_config.enable_continuous,
        )

    async def forward_request(
        request: Request,
        upstream_url: str,
        path: str,
    ) -> StreamingResponse:
        target_url = f"{upstream_url}/{path}"
        if request.url.query:
            target_url = f"{target_url}?{request.url.query}"
        headers = {
            name: value
            for name, value in request.headers.items()
            if name.lower() not in PROXY_REQUEST_HEADERS_TO_SKIP
        }
        proxy_client: httpx.AsyncClient = request.app.state.proxy_client
        upstream_request = proxy_client.build_request(
            request.method,
            target_url,
            headers=headers,
            content=request.stream(),
        )
        try:
            response = await proxy_client.send(upstream_request, stream=True)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"upstream service unavailable: {exc}",
            ) from exc
        response_headers = {
            name: value
            for name, value in response.headers.items()
            if name.lower() not in PROXY_RESPONSE_HEADERS_TO_SKIP
        }
        return StreamingResponse(
            response.aiter_bytes(),
            status_code=response.status_code,
            headers=response_headers,
            background=BackgroundTask(response.aclose),
        )

    @app.api_route(
        "/api/tts/{path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )
    async def proxy_tts(request: Request, path: str) -> StreamingResponse:
        return await forward_request(request, runtime_config.tts_url, path)

    @app.api_route(
        "/api/stt/{path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )
    async def proxy_stt(request: Request, path: str) -> StreamingResponse:
        return await forward_request(request, runtime_config.stt_url, path)

    return app


app = create_app()
