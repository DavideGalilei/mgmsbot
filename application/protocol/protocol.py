import json
from enum import Enum, auto
from io import BytesIO


class InvalidPacket(Exception):
    pass


class PayloadTooBig(InvalidPacket):
    def __init__(self, size: int):
        self.size = size

    def __str__(self):
        return f"The Payload size is too big (length={self.size})"


class Action(Enum):
    NO_OP = 1
    RECEIVE = auto()
    SEND_USER = auto()
    BROADCAST = auto()
    KICK = auto()
    INFO_LIST = auto()
    JOINED = auto()
    LEFT = auto()


class Payload:
    def __init__(self, kind: Action, data: dict = None):
        self.kind = kind
        self.data = data if data is not None else {}

    def serialize(self) -> str:
        return json.dumps(
            {
                "a": self.kind.value,
                "d": self.data,
            },
            separators=(",", ":"),
        )

    @staticmethod
    def deserialize(data: str) -> "Payload":
        jsoned = json.loads(data)
        kind = Action(jsoned.get("a", 0))
        data = jsoned.get("d", {})

        return Payload(kind=kind, data=data)

    def __str__(self):
        return f"Payload(kind={Action(self.kind)}, data={self.data})"
