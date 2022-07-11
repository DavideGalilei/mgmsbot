from fastapi import APIRouter

from application.config.available_games import AVAILABLE_GAMES
from application.config.config import shared
from application.utils.check_game_data import check_game_data

game_router = APIRouter(
    prefix="/game",
    tags=["games"],
    responses={404: {"description": "Not found"}},
)


@game_router.get("/{game_name}")
async def serve_game(game_name: str, d: str):
    if game_name not in AVAILABLE_GAMES:
        return {"ok": False, "reason": "Game not available"}

    decrypted = await check_game_data(d)

    await shared.bot.send_message(decrypted["i"], "Opened game")
    return {"ok": True, "data": d, "decrypted": decrypted}
