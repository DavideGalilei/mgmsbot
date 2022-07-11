import json
from base64 import urlsafe_b64decode
from typing import Optional

from application.config.config import shared
from application.utils.encryption import decrypt


async def check_game_data(data: str) -> Optional[dict]:
    try:
        encrypted = urlsafe_b64decode(data + "=" * (-len(data) % 4))
        decrypted = json.loads(decrypt(encrypted, shared.SECRET))
        return decrypted
    except Exception:
        return None
