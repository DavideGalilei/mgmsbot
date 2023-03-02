import asyncio
import time
from typing import Any, NamedTuple, Dict

from application.utils.background_task import background


class Entry(NamedTuple):
    timestamp: float
    record: Any


class Cache:
    _workers = []

    def __init__(self, c, timeout: int = 300):
        self.c: Dict[Any, Entry] = c
        self._workers.append(lambda: cache_cleaner(self, timeout))

    def __setitem__(self, key, value):
        self.c[key] = Entry(time.time(), value)

    def __getitem__(self, item):
        return self.c[item].record

    def pop(self, key):
        return self.c.pop(key)

    def __contains__(self, item):
        return item in self.c

    def keys(self):
        return self.c.keys()

    def values(self):
        for value in self.c.values():
            yield value.record

    def items(self):
        for key, value in self.c.items():
            yield key, value.record

    @classmethod
    async def start_workers(cls):
        for worker in cls._workers:
            background(worker())


async def cache_cleaner(cache: Cache, lifespan: int):
    while not await asyncio.sleep(lifespan):
        for user_id in list(cache.keys()):
            if cache.c[user_id].timestamp < time.time() - lifespan:
                cache.pop(user_id)


background(Cache.start_workers())
