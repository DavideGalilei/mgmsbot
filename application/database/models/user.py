from tortoise import fields
from tortoise.models import Model

from application.utils import __custom_str__


class User(Model):
    """
    The User model
    """

    user_id = fields.BigIntField(pk=True)
    name = fields.TextField(null=True)

    blocked = fields.BooleanField(default=False, null=False)
    deleted = fields.BooleanField(default=False, null=False)
    banned = fields.BooleanField(default=False, null=False)
    admin = fields.BigIntField(default=0, null=False)

    language = fields.CharField(max_length=8, default="en")
    coins = fields.BigIntField(default=0, null=False)
    last_activity = fields.DatetimeField(auto_now=True, null=False)
    # playtime bigint
    # play_logs fk

    __str__ = __repr__ = __custom_str__

    class Meta:
        table = "users"
        table_description = "This table contains all the users that used the bot"

    class PydanticMeta:
        # exclude = ["id"]
        allow_cycles = True
        max_recursion = 4
