import asyncio
import contextlib
import threading
from collections import defaultdict
from typing import Dict, Optional

from fastapi import WebSocket
from loguru import logger
from pyrogram import Client
from pyrogram.types import User, CallbackQuery
from starlette.websockets import WebSocketState

from application.config.available_games import AVAILABLE_GAMES
from application.protocol.protocol import Payload, Action
from application.utils.cache import Cache


class SuperLock:
    def __init__(self):
        self.lock = threading.Lock()
        self.async_lock = asyncio.Lock()

    async def __aenter__(self):
        await self.async_lock.acquire()
        # self.lock.acquire()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.async_lock.release()
        # self.lock.release()


class Player:
    def __init__(self, user: User, playing: bool = False):
        self.user = user
        self.is_playing = playing
        self.connection: Optional[WebSocket] = None

    def set_conn(self, websocket: WebSocket):
        self.connection = websocket

    async def send_payload(self, p: Payload):
        await self.connection.send_bytes(p.serialize())

    async def recv_payload(self) -> Payload:
        # Max size is 1MB btw
        # The max_size parameter enforces the maximum size for incoming messages in bytes.
        # The default value is 1MB. None disables the limit.
        # If a message larger than the maximum size is received,
        # recv() will return None and the connection will be closed with status code 1009.
        # https://websockets.readthedocs.io/en/2.2/

        return Payload.deserialize(await self.connection.receive_bytes())


class Room:
    def __init__(self, chat_instance: str, game_name: str):
        self.chat_instance = chat_instance
        self.game_name = game_name
        self.lock = SuperLock()
        self.connections: Dict[int, Player] = {}
        self.players_cache = Cache({})

        # asyncio.create_task(room_cleaner(self))

    async def clean_inactive(self, player: Player):
        await asyncio.sleep(20)
        if (
            player.user.id in self.connections
            and not self.connections[player.user.id].is_playing
        ):
            logger.info("Kicked inactive player (is_playing=False)")
            await self.pop(player.user.id)

    async def add_player(self, player: Player):
        async with self.lock:
            if not player.is_playing:
                asyncio.create_task(self.clean_inactive(player))

            self.players_cache[player.user.id] = player

            if player.user.id not in self.connections:
                self.connections[player.user.id] = player

    async def pop(self, user_id: int):
        async with self.lock:
            if user_id in self.players_cache:
                self.players_cache.pop(user_id)
            if user_id in self.connections:
                self.connections.pop(user_id)

    async def kick(self, player: Player, reason: dict = None):
        async with self.lock:
            with contextlib.suppress(Exception):
                await player.send_payload(Payload(Action.KICK, data=reason))

            if player.user.id in self.connections:
                self.connections.pop(player.user.id)
            if (
                player.connection.application_state == WebSocketState.CONNECTED
                and player.connection.client_state == WebSocketState.CONNECTED
            ):
                with contextlib.suppress(TypeError):
                    await player.connection.close()


class RoomManager:
    rooms = defaultdict(lambda: {"lock": SuperLock(), "chats": {}})

    def __init__(self, bot: Client):
        self.bot = bot

    async def get_game_room(self, query: CallbackQuery) -> Room:
        rooms = self.rooms[query.game_short_name]
        async with rooms["lock"]:
            if query.chat_instance not in rooms["chats"]:
                rooms["chats"][query.chat_instance] = Room(query.chat_instance, query.game_short_name)

        room: Room = rooms["chats"][query.chat_instance]
        await room.add_player(Player(query.from_user, playing=False))
        return room

    async def clean_soon_if_empty(self, room: Room, seconds: int = 20):
        await asyncio.sleep(seconds)
        if not room.connections:
            logger.info(
                "Cleaning inactive empty room after {seconds} seconds (game={game_name}, {chat_instance})",
                seconds=seconds,
                game_name=room.game_name,
                chat_instance=room.chat_instance,
            )
            self.rooms[room.game_name]["chats"].pop(room.chat_instance)

    @classmethod
    async def inactive_cleaner(cls, every_seconds: int):
        while not await asyncio.sleep(every_seconds):
            for game in AVAILABLE_GAMES:
                if game in cls.rooms:
                    async with cls.rooms[game]["lock"]:
                        for chat in list(cls.rooms[game]["chats"].keys()):
                            if not len(cls.rooms[game]["chats"][chat].connections):
                                logger.info(
                                    "Cleaned inactive chat (game={game}, {chat})",
                                    chat=chat,
                                    game=game,
                                )
                                cls.rooms[game]["chats"].pop(chat)


asyncio.get_event_loop().create_task(RoomManager.inactive_cleaner(every_seconds=60))
