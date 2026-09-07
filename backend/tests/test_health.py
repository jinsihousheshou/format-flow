import asyncio

from app.main import app, health


def test_health_routes_are_public_and_available():
    paths = {route.path for route in app.routes}
    assert "/health" in paths
    assert "/api/health" in paths
    assert "/api/audio/parse" in paths
    assert "/api/audio/download" in paths


def test_health_payload():
    payload = asyncio.run(health())
    assert payload["status"] == "ok"
    assert payload["service"] == "format-flow-video"
    assert payload["yt_dlp"]
