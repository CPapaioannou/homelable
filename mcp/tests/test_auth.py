import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.anyio
async def test_health_no_key(client):
    resp = await client.get("/health")
    assert resp.status_code == 200


@pytest.mark.anyio
async def test_missing_api_key(client):
    resp = await client.get("/mcp")
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_wrong_api_key(client):
    resp = await client.get("/mcp", headers={"X-API-Key": "wrong"})
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_valid_api_key_passes(client, api_key):
    # Auth passes — mock handle_request so we don't need a live MCP session
    with patch("app.main.session_manager.handle_request", new_callable=AsyncMock):
        resp = await client.get("/mcp", headers={"X-API-Key": api_key})
    assert resp.status_code != 401
