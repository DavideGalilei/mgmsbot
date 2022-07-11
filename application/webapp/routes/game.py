from fastapi import APIRouter

game_router = APIRouter(
    prefix="/game",
    tags=["games"],
    responses={404: {"description": "Not found"}},
)


@game_router.get("-{data}")
async def serve_game(data: str):
    print(data)
    return {"ok": True}
