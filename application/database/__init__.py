from fastapi import FastAPI
from tortoise import Tortoise
from tortoise.contrib.fastapi import register_tortoise
from tortoise.exceptions import DBConnectionError

from application.config.settings import Settings


async def setup_database(app: FastAPI, settings: Settings):
    config = {
        "connections": {
            "default": {
                "engine": "tortoise.backends.sqlite"
                if settings.as_sqlite
                else "tortoise.backends.asyncpg",
                "credentials": {
                    "file_path": settings.database,
                }
                if settings.as_sqlite
                else {
                    "host": settings.DB_HOST,
                    "port": settings.DB_PORT,
                    "user": settings.DB_USER,
                    "password": settings.DB_PASSWORD,
                    "database": settings.database,
                },
            }
        },
        "apps": {
            "main": {
                "models": settings.MODELS,
                "default_connection": "default",
            }
        },
        "use_tz": False,
        "timezone": "UTC",
    }

    try:
        await Tortoise.init(config=config)
    except DBConnectionError:
        await Tortoise.init(config=config, _create_db=True)

    # await Tortoise.generate_schemas()

    register_tortoise(
        app,
        config=config,
        generate_schemas=True,
        add_exception_handlers=True,
    )
