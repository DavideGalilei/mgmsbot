import base64
from typing import Optional

from application.config.config import shared
from application.protocol.rooms import Player
from application.utils.cache import Cache

_profile_pictures = Cache({})


async def get_pic(player: Player) -> Optional[str]:
    if player.user.id in _profile_pictures:
        return _profile_pictures[player.user.id]

    if await shared.bot.get_chat_photos_count(player.user.id) < 1:
        _profile_pictures[player.user.id] = None
        return None

    async for photo in shared.bot.get_chat_photos(player.user.id, limit=1):
        pic = await shared.bot.download_media(photo, in_memory=True)
        pic.seek(0)
        data = pic.read()
        _profile_pictures[player.user.id] = base64.b64encode(data).decode("ascii")
        return _profile_pictures[player.user.id]
