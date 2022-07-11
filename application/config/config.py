import os


class _Config:
    SALT: bytes
    SECRET: str


shared = _Config()
shared.SALT = bytes.fromhex(os.getenv("SALT"))
shared.SECRET = os.getenv("SECRET")

assert shared.SALT is not None, "shared.SALT is None"
assert shared.SECRET is not None, "shared.SECRET is None"
