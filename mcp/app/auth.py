import hmac
import json
from starlette.types import ASGIApp, Receive, Scope, Send

from .config import settings

_BYPASS_PATHS = {"/health", "/register"}


class ApiKeyMiddleware:
    """Pure ASGI middleware — compatible with SSE/streaming responses.

    BaseHTTPMiddleware buffers the full response body and breaks SSE streams.
    This implementation operates at the ASGI scope level and never touches
    the response stream.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")

        if path in _BYPASS_PATHS or path.startswith("/.well-known/"):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        key = headers.get(b"x-api-key", b"").decode()
        expected = settings.mcp_api_key

        if not key or not hmac.compare_digest(key.encode(), expected.encode()):
            body = json.dumps({"detail": "Invalid or missing X-API-Key"}).encode()
            await send({"type": "http.response.start", "status": 401,
                        "headers": [(b"content-type", b"application/json"),
                                    (b"content-length", str(len(body)).encode())]})
            await send({"type": "http.response.body", "body": body, "more_body": False})
            return

        await self.app(scope, receive, send)
