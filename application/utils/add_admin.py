from loguru import logger

from application.config import ADMINS
from application.database.models import User


@logger.catch(reraise=True)
async def add_admin(user_id: int):
    await User.update_or_create(
        defaults=dict(admin=True),
        user_id=user_id,
    )
    ADMINS.add(user_id)

    logger.success("Added {user_id} as an admin", user_id=user_id)
