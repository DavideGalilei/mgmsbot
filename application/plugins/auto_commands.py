from pyrogram import Client, filters
from pyrogram.types import Message

from application import strings
from application.database.models import User
from application.plugins.antiflood import FLOODERS
from application.utils.cache import Cache


_db_cache = Cache({}, timeout=60 * 3)


@Client.on_message(filters.private & ~filters.forwarded & ~FLOODERS)
async def auto_command(_: Client, msg: Message):
    if msg.from_user and msg.from_user.id not in _db_cache:
        user = await User.update_or_create(
            defaults=dict(
                name=msg.from_user.first_name,
                last_name=msg.from_user.last_name,
                language=msg.from_user.language_code or "en",
            ),
            user_id=msg.from_user.id,
        )
        _db_cache[msg.from_user.id] = user

    if msg.text and msg.text.startswith("/"):
        command = msg.text.split(maxsplit=1)[0].removeprefix("/")

        if command in strings["commands"]:
            reply = strings["commands"][command](msg, msg.from_user.language_code)
            return await msg.reply_text(
                text=reply["text"],
                reply_markup=reply["keyboard"],
            )
    return await msg.continue_propagation()
