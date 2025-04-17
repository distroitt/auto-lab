from fastapi import Response, APIRouter, HTTPException
import requests
from app.schemas.user import UserLogin
from app.core.security import create_access_token
from app.core.config import settings
router = APIRouter()

@router.post("/auth")
async def root(creds: UserLogin, response: Response):
    data = {'username' : creds.username, 'password': creds.password}
    resp = requests.post(f"https://iis.bsuir.by/api/v1/auth/login", json=data)
    if resp.status_code == 200:
        token = create_access_token({"uid": creds.username})
        response.set_cookie(key=settings.JWT_ACCESS_COOKIE_NAME, value=token, httponly=True)
        return {"access_token": token}
    return HTTPException(401)

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.JWT_ACCESS_COOKIE_NAME)