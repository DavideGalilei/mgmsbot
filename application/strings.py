from typing import Union, List, NamedTuple

from pyrogram.types import InlineKeyboardMarkup, InlineKeyboardButton, Message


class Button(NamedTuple):
    text: str
    type: str
    value: str


def _(
    buttons: Union[Button, List[Union[Button, List[Button]]]]
) -> InlineKeyboardMarkup:
    unflatten: List[List[Button]] = (
        [button if isinstance(button, list) else [button] for button in buttons]
        if isinstance(buttons, list)
        else [[buttons]]
    )

    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(text=button.text, **{button.type: button.value})
                for button in buttons
            ]
            for buttons in unflatten
        ]
    )


def _name(msg: Message) -> str:
    user = msg.from_user or msg.sender_chat
    if user is None:
        return "null"
    return user.first_name or user.title or "null"


strings = {
    "commands": {
        "start": lambda message, lang: {
            "en": {
                "text": "Welcome to this bot! Use me inline",
                "keyboard": _(
                    Button("@ try me", "switch_inline_query_current_chat", "")
                ),
            }
        }.get(lang, "en"),
    }
}
