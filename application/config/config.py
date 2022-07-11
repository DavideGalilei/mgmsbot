from pyrogram import Client

from application.protocol.rooms import RoomManager


class _Config:
    SALT: bytes
    SECRET: str

    bot: Client
    manager: RoomManager


shared = _Config()
