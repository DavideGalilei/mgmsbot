from pyrogram import Client, filters
from pyrogram.types import Message

from application import strings
from application.plugins.antiflood import FLOODERS


@Client.on_message(filters.private & ~filters.forwarded & ~FLOODERS)
async def auto_command(_: Client, msg: Message):
    if msg.text and msg.text.startswith("/"):
        command = msg.text.split(maxsplit=1)[0].removeprefix("/")

        if command in strings["commands"]:
            reply = strings["commands"][command](msg, msg.from_user.language_code)
            return await msg.reply_text(
                text=reply["text"],
                reply_markup=reply["keyboard"],
            )
    return await msg.continue_propagation()
