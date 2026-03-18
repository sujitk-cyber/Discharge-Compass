from __future__ import annotations

from fastapi import HTTPException, Request


def api_key_dependency(expected_key: str):
    async def dependency(request: Request):
        provided = request.headers.get("x-api-key")
        if not provided:
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.lower().startswith("bearer "):
                provided = auth_header.split(" ", 1)[1]
        if provided != expected_key:
            raise HTTPException(status_code=401, detail="Unauthorized")

    return dependency
