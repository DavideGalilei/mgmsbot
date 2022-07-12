import asyncio
import threading
from collections import defaultdict
from typing import Dict, Optional

from fastapi import WebSocket
from pyrogram import Client
from pyrogram.raw.types import User
from pyrogram.types import CallbackQuery
from starlette.websockets import WebSocketState

from application.protocol.protocol import Payload


class SuperLock:
    def __init__(self):
        self.lock = threading.Lock()
        self.async_lock = asyncio.Lock()

    async def __aenter__(self):
        self.lock.acquire()
        await self.async_lock.acquire()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.async_lock.release()
        self.lock.release()


class Player:
    def __init__(self, user: User):
        self.user = user
        self.connection: Optional[WebSocket] = None

    def set_conn(self, websocket: WebSocket):
        self.connection = websocket

    async def send_payload(self, p: Payload):
        await self.connection.send_bytes(p.serialize())

    async def recv_payload(self) -> Payload:
        return Payload.deserialize(await self.connection.receive_bytes())


class Room:
    def __init__(self, chat_instance: str):
        self.chat_instance = chat_instance
        self.lock = SuperLock()
        self.connections: Dict[int, Player] = {}

        # asyncio.create_task(room_cleaner(self))

    async def add_player(self, player: Player):
        async with self.lock:
            self.connections[player.user.id] = player

    async def pop(self, user_id: int):
        async with self.lock:
            if user_id in self.connections:
                self.connections.pop(user_id)

    async def kick(self, player: Player):
        async with self.lock:
            if player.user.id in self.connections:
                self.connections.pop(player.user.id)
            if (
                player.connection.application_state == WebSocketState.CONNECTED
                and player.connection.client_state == WebSocketState.CONNECTED
            ):
                await player.connection.close()


class RoomManager:
    def __init__(self, bot: Client):
        self.bot = bot
        self.rooms = defaultdict(lambda: {"lock": SuperLock(), "chats": {}})

    async def get_game_room(self, query: CallbackQuery) -> Room:
        rooms = self.rooms[query.game_short_name]
        async with rooms["lock"]:
            if query.chat_instance not in rooms["chats"]:
                rooms["chats"][query.chat_instance] = Room(query.chat_instance)

        room: Room = rooms["chats"][query.chat_instance]
        await room.add_player(Player(query.from_user))

        return room