import base64
import json
from uuid import uuid4

from pyrogram import Client
from pyrogram.raw.functions.messages import SetInlineBotResults
from pyrogram.raw.types import (
    InputBotInlineResultGame,
    InlineBotSwitchPM,
    InputBotInlineMessageGame,
)
from pyrogram.types import InlineQuery, CallbackQuery

from application.config.available_games import AVAILABLE_GAMES
from application.config.config import shared
from application.protocol.rooms import Room
from application.utils.encryption import encrypt


@Client.on_inline_query()
async def games(bot: Client, query: InlineQuery):
    return await bot.invoke(
        SetInlineBotResults(
            query_id=int(query.id),
            results=[
                InputBotInlineResultGame(
                    id=uuid4().hex,
                    short_name=short_name,
                    send_message=InputBotInlineMessageGame(
                        reply_markup=None,
                    ),
                )
                for short_name, game in AVAILABLE_GAMES.items()
            ],
            private=True,
            cache_time=1,
            switch_pm=InlineBotSwitchPM(text="^-^", start_param="switch"),
        )
    )


@Client.on_callback_query(group=-9999)
async def answer_game(bot: Client, query: CallbackQuery):
    if not query.game_short_name:
        return await query.continue_propagation()

    room: Room = await shared.manager.get_game_room(query)

    data = (
        base64.urlsafe_b64encode(
            encrypt(
                json.dumps(
                    {
                        "i": query.from_user.id,
                        "c": room.chat_instance,
                        "p": len(room.connections),
                    }
                ),
                secret=shared.SECRET,
            )
        )
        .decode("ascii")
        .rstrip("=")
    )

    return await bot.answer_callback_query(
        query.id,
        url=f"http://127.0.0.1:8000/game/{query.game_short_name}?d={data}",
    )
