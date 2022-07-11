from typing import NamedTuple, Dict


class Game(NamedTuple):
    name: str


AVAILABLE_GAMES: Dict[str, Game] = dict(
    test=Game(name="A cool game"),
)
