from typing import NamedTuple, Dict


class Game(NamedTuple):
    name: str
    description: str


AVAILABLE_GAMES: Dict[str, Game] = dict(
    test=Game(name="Test", description="Testing purposes"),
    chat=Game(name="Chat :D", description="Chat with your friends!"),
    syncvideo=Game(name="SyncVideo", description="Play youtube video in sync with other users"),
)
