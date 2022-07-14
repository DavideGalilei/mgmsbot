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

    def serialize(self):
        b = self.kind.value.to_bytes(2, "little", signed=False)
        jsoned = json.dumps(self.data, separators=(",", ":")).encode()
        b += len(jsoned).to_bytes(4, "little", signed=False)
        b += jsoned
        return b

    @staticmethod
    def deserialize(data: bytes) -> "Payload":
        stream = BytesIO(data)
        kind = Action(int.from_bytes(stream.read(2), "little", signed=False))

        length = int.from_bytes(stream.read(4), "little", signed=False)
        if length > 0x00FFFFFF:
            raise PayloadTooBig(size=length)

        decoded = "".join(map(chr, stream.read(length)))
        jsoned = json.loads(decoded)
        return Payload(kind=kind, data=jsoned)

    def __str__(self):
        return f"Payload(kind={Action(self.kind)}, data={self.data})"
