from fastapi import HTTPException, Request
from app.core.config import settings
from app.core.security import decode_access_token


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(settings.JWT_ACCESS_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    return payload
