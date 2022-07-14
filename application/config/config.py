from pyrogram import Client

from application.protocol.rooms import RoomManager


class Config:
    SALT: bytes
    SECRET: str

    bot: Client
    manager: RoomManager


shared = Config()
