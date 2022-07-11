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
from tortoise import run_async

from application.config.settings import Settings
from application.database import setup_database
from application.database.models.user import User
from application.utils.add_admin import add_admin
from application.webapp.routes.game import game_router

root = Path(__file__).parent.resolve(strict=True)


async def main():
    app = FastAPI(title="Tortoise ORM FastAPI example")
    app.include_router(game_router)

    fmt = "[{time}] [<bold>{level: <8}</bold>] - {name}:{function}:{line} - <level>{message}</level>"
    logger.configure(
        handlers=[{"sink": sys.stderr, "format": fmt}], extra={"colorize": True}
    )

    logger.info("Starting...")

    logger.info("Loading env vars...")
    load_dotenv(root / ".env")

    logger.info("Loading database...")
    await setup_database(
        app,
        Settings(
            database=Path.as_posix(root / "db.sqlite"),
            as_sqlite=True,
        ),
    )

    bot = Client(
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

    Thread(target=lambda: uvicorn.run(app, host="0.0.0.0", port=8000), daemon=True).start()

    while True:
        await asyncio.sleep(600)


if __name__ == "__main__":
    try:
        run_async(main())
    except KeyboardInterrupt:
        logger.info("Ctrl-C | Interrupting the program...")

    logger.success("Execution has terminated")
    sys.exit(0)
