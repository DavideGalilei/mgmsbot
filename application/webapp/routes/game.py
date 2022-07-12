from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from application.config.available_games import AVAILABLE_GAMES
from application.utils.check_game_data import check_game_data

static = (Path(__file__).parent.parent / "static").resolve(strict=True)

game_router = APIRouter(
    prefix="/game",
    tags=["games"],
    responses={404: {"description": "Not found"}},
)

templates = Jinja2Templates(directory=static)


@game_router.get("/{game_name}", response_class=HTMLResponse)
async def serve_game(request: Request, game_name: str, d: str):
    if game_name not in AVAILABLE_GAMES:
        return {"ok": False, "reason": "Game not available"}

    decrypted = await check_game_data(d)

    # await shared.bot.send_message(decrypted["i"], "Opened game")

    return templates.TemplateResponse(
        "game/index.jinja2",
        {
            "request": request,
            "game_name": AVAILABLE_GAMES[game_name].name,
        },
    )


@game_router.post("/{game_name}")
async def serve_game_data(game_name: str, d: str):
    if game_name not in AVAILABLE_GAMES:
        return {"ok": False, "reason": "Game not available"}

    decrypted = await check_game_data(d)

    return {"ok": True, "data": d, "decrypted": decrypted}
