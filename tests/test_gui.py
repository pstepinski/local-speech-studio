from typing import Any

import anyio
import httpx
from fastapi import FastAPI

from gui_app.main import GuiConfig, create_app


def app_request(
    app: FastAPI,
    method: str,
    path: str,
    **kwargs: Any,
) -> httpx.Response:
    async def send() -> httpx.Response:
        async with app.router.lifespan_context(app):
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://testserver",
            ) as client:
                return await client.request(method, path, **kwargs)

    return anyio.run(send)


def test_serves_browser_gui() -> None:
    config = GuiConfig(
        tts_url="http://tts.example:9000",
        stt_url="http://stt.example:9001",
        enable_tts=True,
        enable_stt=True,
        enable_continuous=True,
    )
    response = app_request(create_app(config), "GET", "/")

    assert response.status_code == 200
    assert "Tekst i głos" in response.text
    assert 'id="speech-form"' in response.text
    assert 'id="transcription-form"' in response.text
    assert 'id="continuous-panel"' in response.text
    assert 'src="/static/continuous.js"' in response.text
    assert 'src="/static/i18n.js"' in response.text
    assert 'data-language="pl"' in response.text
    assert 'data-language="en"' in response.text
    assert 'href="/static/favicon.svg"' in response.text


def test_serves_favicon_for_browser_default_path() -> None:
    response = app_request(create_app(), "GET", "/favicon.ico")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/svg+xml"
    assert response.content.startswith(b"<svg")


def test_exposes_same_origin_proxy_addresses_and_visibility() -> None:
    config = GuiConfig(
        tts_url="https://tts.example.test",
        stt_url="https://stt.example.test",
        enable_tts=False,
        enable_stt=True,
        enable_continuous=False,
    )
    response = app_request(create_app(config), "GET", "/config")

    assert response.json() == {
        "tts_url": "/api/tts",
        "stt_url": "/api/stt",
        "enable_tts": False,
        "enable_stt": True,
        "enable_continuous": False,
    }


def test_proxies_requests_to_internal_services() -> None:
    async def upstream(request: httpx.Request) -> httpx.Response:
        assert request.url == "http://tts.internal:8000/v1/speech?voice=test"
        assert request.headers["content-type"] == "application/json"
        assert await request.aread() == b'{"text":"test"}'
        return httpx.Response(
            200,
            content=b"wave-data",
            headers={"content-type": "audio/wav"},
        )

    config = GuiConfig(
        tts_url="http://tts.internal:8000",
        stt_url="http://stt.internal:8001",
        enable_tts=True,
        enable_stt=True,
        enable_continuous=True,
    )
    app = create_app(config, proxy_transport=httpx.MockTransport(upstream))

    response = app_request(
        app,
        "POST",
        "/api/tts/v1/speech?voice=test",
        content=b'{"text":"test"}',
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 200
    assert response.content == b"wave-data"
    assert response.headers["content-type"] == "audio/wav"


def test_gui_health() -> None:
    response = app_request(create_app(), "GET", "/health")

    assert response.json() == {"status": "ok"}
