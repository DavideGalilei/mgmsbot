import asyncio
import time
from collections import defaultdict
from typing import Union

from pyrogram import Client, filters
from pyrogram.types import Message

from application.utils.background_task import background

FLOODERS = filters.user()

_users = defaultdict(list)
MESSAGES = 3
SECONDS = 6


async def is_flood(
    user_id: int,
    messages: int = MESSAGES,
    seconds: int = SECONDS,
    users: defaultdict = None,
) -> Union[bool, None]:
    """Checks if a user is flooding"""
    users = users if users is not None else _users

    users[user_id].append(time.time())
    check = list(filter(lambda x: time.time() - int(x) < seconds, users[user_id]))
    if len(check) > messages:
        users[user_id] = check
        return True


@Client.on_message(filters.all, group=-9999)
async def anti_flood(_: Client, msg: Message):
    user = msg.from_user or msg.sender_chat
    if not user:
        return

    if await is_flood(user.id):
        return FLOODERS.add(user.id)
    elif msg.from_user.id in FLOODERS:
        FLOODERS.discard(user.id)
    return await msg.continue_propagation()


async def cleaner(
    users: defaultdict,
    sleep: float = 30,
    seconds: int = SECONDS,
):
    while not await asyncio.sleep(sleep):
        for user, messages in users.copy().items():
            check = list(filter(lambda x: time.time() - int(x) < seconds, users[user]))
            if not check:
                del users[user]


background(cleaner(users=_users))
