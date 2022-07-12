from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger

from application.config.available_games import AVAILABLE_GAMES
from application.config.config import shared
from application.protocol.protocol import Action, Payload
from application.protocol.rooms import Room, Player
from application.utils.check_game_data import check_game_data
from application.utils.get_pic import get_pic

ws_router = APIRouter(
    prefix="/ws",
    tags=["ws"],
    responses={404: {"description": "Not found"}},
)


@ws_router.websocket("/game/{game_name}")
async def websocket_endpoint(websocket: WebSocket, game_name: str, d: str):
    if game_name not in AVAILABLE_GAMES:
        return await websocket.close()

    decrypted = await check_game_data(d)
    if not decrypted:
        return await websocket.close()

    if decrypted["c"] not in shared.manager.rooms[game_name]["chats"]:
        return await websocket.close()

    room: Room = shared.manager.rooms[game_name]["chats"][decrypted["c"]]

    user_id = decrypted["i"]

    if user_id in room.connections and room.connections[user_id].is_playing:
        return await websocket.close()
    elif user_id not in room.connections:
        # reconnecting
        if user_id in room.players_cache:
            # could find a cached player
            await room.add_player(room.players_cache[user_id])
        else:
            return await websocket.close()

    player: Player = room.connections[user_id]
    player.is_playing = True

    await websocket.accept()
    player.set_conn(websocket)

    await room.add_player(player)

    # await shared.bot.send_message(user_id, "Opened websocket")

    try:
        await player.send_payload(
            Payload(
                kind=Action.INFO_LIST,
                data={
                    "count": len(room.connections),
                    "users": [
                        {
                            "id": p.user.id,
                            "name": p.user.first_name,
                            "photo": await get_pic(p),
                        }
                        for p in room.connections.values()
                    ],
                },
            )
        )

        for p in room.connections.values():
            if p.user.id != player.user.id:
                await p.send_payload(
                    Payload(
                        kind=Action.JOINED,
                        data={
                            "id": player.user.id,
                            "name": player.user.first_name,
                            "photo": await get_pic(player),
                        },
                    )
                )

        while True:
            data = await player.recv_payload()

            if data.kind == Action.BROADCAST:
                for uid, p in room.connections.items():
                    if uid != player.user.id:
                        await p.send_payload(
                            Payload(
                                kind=data.kind,
                                data={"u": player.user.id, "data": data.data},
                            )
                        )
            elif data.kind == Action.SEND_USER:
                if data.data["i"] in room.connections:
                    await room.connections[data.data["i"]].send_payload(
                        Payload(
                            kind=data.kind,
                            data={"u": player.user.id, "data": data.data},
                        )
                    )
            else:
                logger.critical("Kicking...")
                await player.send_payload(Payload(Action.KICK))
                await room.kick(player)
    except (WebSocketDisconnect, RuntimeError):
        logger.info("Client disconnected.")
    finally:
        await room.kick(player)
        for p in room.connections.values():
            await p.send_payload(
                Payload(
                    kind=Action.LEFT,
                    data={
                        "id": player.user.id,
                        "name": player.user.first_name,
                    },
                )
            )
