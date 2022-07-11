from loguru import logger

from application.config import ADMINS
from application.database.models import User


@logger.catch(reraise=True)
async def remove_admin(user_id: int):
    await User.update_or_create(
        defaults=dict(user_id=user_id),
        admin=False,
    )
    ADMINS.add(user_id)

    logger.success("Removed {user_id} as an admin", user_id=user_id)
