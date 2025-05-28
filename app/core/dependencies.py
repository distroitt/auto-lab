from fastapi import HTTPException, Request
from app.core.config import settings
from app.core.security import decode_access_token


async def get_current_user(request: Request) -> dict:
    """Возвращает информацию о текущем пользователе"""
    token = request.cookies.get(settings.JWT_ACCESS_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    return payload

def is_admin(data):
    if isinstance(data, Request):
        return decode_access_token(data.cookies[settings.JWT_ACCESS_COOKIE_NAME])["uid"] in settings.ADMINS
    elif isinstance(data, dict):
        return data.get("uid") in settings.ADMINS
    elif isinstance(data, str):
        return data in settings.ADMINS
    else:
        return False