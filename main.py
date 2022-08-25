import asyncio
import os
import sys
from pathlib import Path
from threading import Thread

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from loguru import logger
from pyrogram import Client
from pyrogram.enums import ParseMode
from starlette.routing import Mount
from tortoise import run_async

from application.config.config import shared
from application.config.settings import Settings
from application.database import setup_database
from application.database.models.user import User
from application.protocol.rooms import RoomManager
from application.protocol.routes import ws_router
from application.utils import SafeStaticFiles
from application.utils.add_admin import add_admin
from application.webapp.routes.game import game_router

root = Path(__file__).parent.resolve(strict=True)
data = root / "data"
data.mkdir(parents=True, exist_ok=True)

static = (root / "application" / "webapp" / "static").resolve(strict=True)

FMT = "[{time}] [<bold>{level}</bold>] - {name}:{function}:{line} - <level>{message}</level>"


async def main():
    logger.info("Starting...")
    logger.info("Loading env vars...")
    load_dotenv(root / ".env")

    shared.DOMAIN = os.getenv("DOMAIN", "0.0.0.0")
    shared.URL = os.getenv("URL", "http://localhost:8000")

    app = FastAPI(
        title="Multiplayer Inline Games",
        routes=[
            Mount("/static", SafeStaticFiles(directory=static), name="static"),
        ],
        servers=[
            {"url": shared.URL, "description": "Production environment"},
        ],
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.include_router(game_router)
    app.include_router(ws_router)

    logger.configure(
        handlers=[{"sink": sys.stderr, "format": FMT}],
        extra={"colorize": True},
    )

    shared.SALT = bytes.fromhex(os.getenv("SALT"))
    shared.SECRET = os.getenv("SECRET")

    logger.info("Loading database...")
    await setup_database(
        app,
        Settings(
            database=Path.as_posix(data / "db.sqlite"),
            as_sqlite=True,
        ),
    )

    shared.bot = bot = Client(
        "games",
        api_id=os.getenv("API_ID"),
        api_hash=os.getenv("API_HASH"),
        bot_token=os.getenv("BOT_TOKEN"),
        test_mode=False,
        workdir=Path.as_posix(root),
        plugins=dict(
            root=Path.as_posix((root / "application" / "plugins").relative_to(root))
        ),
        parse_mode=ParseMode.HTML,
        sleep_threshold=10,
    )

    for user_id in map(int, sys.argv[1:]):
        await add_admin(user_id=user_id)

    logger.info("Starting bot...")
    await bot.start()

    users_count = await User.all().count()
    logger.success(
        "Bot started. username={username!r} (users: {users_count})",
        username=bot.me.username,
        users_count=users_count,
    )

    Thread(
        target=lambda: uvicorn.run(
            app,
            host=shared.DOMAIN,
            port=int(os.getenv("PORT", 8000)),
            proxy_headers=True,
            forwarded_allow_ips="*",
        ),
        daemon=True,
    ).start()

    shared.manager = RoomManager(bot)

    while True:
        await asyncio.sleep(600)


if __name__ == "__main__":
    try:
        run_async(main())
    except KeyboardInterrupt:
        logger.info("Ctrl-C | Interrupting the program...")

    logger.success("Execution has terminated")
    sys.exit(0)
