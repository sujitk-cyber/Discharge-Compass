from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass
from threading import Lock

from fastapi import HTTPException, Request


@dataclass
class Counter:
    window_start: float
    count: int


class RateLimiter:
    def __init__(self, limit_per_minute: int) -> None:
        self.limit = limit_per_minute
        self._counts = defaultdict(lambda: Counter(window_start=time.time(), count=0))
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            counter = self._counts[key]
            if now - counter.window_start >= 60:
                counter.window_start = now
                counter.count = 0
            counter.count += 1
            return counter.count <= self.limit


def rate_limit_dependency(limiter: RateLimiter):
    async def dependency(request: Request):
        client = request.client.host if request.client else "anonymous"
        if not limiter.allow(client):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return dependency
