import json
from enum import Enum, auto
from io import BytesIO


class InvalidPacket(Exception):
    pass


class Action(Enum):
    _value2member_map_: dict

    NO_OP = auto()
    RECEIVE = auto()
    SEND_USER = auto()
    BROADCAST = auto()
    KICK = auto()

    @classmethod
    def from_value(cls, value: int):
        return cls._value2member_map_.get(value, cls.NO_OP)


class Payload:
    def __init__(self, kind: Action, data: dict = None):
        self.kind = kind
        self.data = data if data is not None else {}

    def serialize(self):
        b = self.kind.value.to_bytes(2, "little", signed=False)
        jsoned = json.dumps(self.data, separators=(',', ':')).encode()
        b += len(jsoned).to_bytes(4, "little", signed=False)
        b += jsoned
        return b

    @staticmethod
    def deserialize(data: bytes) -> "Payload":
        stream = BytesIO(data)
        kind = Action.from_value(int.from_bytes(stream.read(2), "little", signed=False))
        length = int.from_bytes(stream.read(4), "little", signed=False)
        jsoned = json.loads(stream.read(length).decode())
        return Payload(kind=kind, data=jsoned)
