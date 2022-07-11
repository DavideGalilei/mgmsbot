import base64
import json
from uuid import uuid4

from pyrogram import Client
from pyrogram.types import InlineQuery, CallbackQuery
from pyrogram.raw.functions.messages import SetInlineBotResults
from pyrogram.raw.types import (
    InputBotInlineResultGame,
    InlineBotSwitchPM,
    InputBotInlineMessageGame,
)

from application.config.config import shared
from application.utils.encryption import encrypt


@Client.on_inline_query()
async def games(bot: Client, query: InlineQuery):
    return await bot.invoke(
        SetInlineBotResults(
            query_id=int(query.id),
            results=[
                InputBotInlineResultGame(
                    id=uuid4().hex,
                    short_name="test",
                    send_message=InputBotInlineMessageGame(
                        reply_markup=None,
                    ),
                )
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

    data = (
        base64.urlsafe_b64encode(
            encrypt(json.dumps({"i": query.from_user.id}), secret=shared.SECRET)
        )
        .decode("ascii")
        .rstrip("=")
    )

    return await bot.answer_callback_query(
        query.id,
        url=f"https://127.0.0.1/{query.game_short_name}?d={data}",
    )
