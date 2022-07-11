from Crypto.Cipher import AES
from Crypto.Util import Counter
from pbkdf2 import PBKDF2

from application.config.config import shared

KEY_BYTES = 32


def encrypt(plaintext: str, secret: str) -> bytes:
    key = PBKDF2(secret, salt=shared.SALT).read(32)
    assert len(key) == KEY_BYTES

    ctr = Counter.new(AES.block_size * 8)

    aes = AES.new(key, AES.MODE_CTR, counter=ctr)

    ciphertext = aes.encrypt(plaintext.encode())
    return ciphertext


def decrypt(ciphertext: bytes, secret: str) -> str:
    key = PBKDF2(secret, salt=shared.SALT).read(32)
    assert len(key) == KEY_BYTES

    ctr = Counter.new(AES.block_size * 8)

    aes = AES.new(key, AES.MODE_CTR, counter=ctr)

    plaintext = aes.decrypt(ciphertext)
    return plaintext.decode()
