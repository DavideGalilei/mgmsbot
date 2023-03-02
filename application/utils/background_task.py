import asyncio
from asyncio import Task
from typing import Coroutine


tasks = set()


def background(c: Coroutine) -> Task:
    t = asyncio.get_event_loop().create_task(c)
    t.add_done_callback(lambda self: tasks.discard(self))
    tasks.add(t)
    return t
