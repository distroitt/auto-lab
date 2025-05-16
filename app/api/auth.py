import requests
from fastapi import Response, APIRouter, HTTPException, Request
from app.schemas.user import UserLogin
from app.core.security import create_access_token
from app.core.config import settings
from app.core.security import decode_access_token
from app.utils.db_service import execute_db_request

router = APIRouter()


@router.post("/auth")
async def root(creds: UserLogin, response: Response):
    data = {'username': creds.username, 'password': creds.password}
    resp = requests.post(f"https://iis.bsuir.by/api/v1/auth/login", json=data)
    if creds.username not in settings.ADMINS:
        data = resp.json()
        fio_parts = data['fio'].split(' ')
        sql = "INSERT OR IGNORE INTO students (id, name, surname, group_id) VALUES (?, ?, ?, ?)"
        execute_db_request(sql, (data["username"], fio_parts[1], fio_parts[0], data["group"]))
    if resp.status_code == 200:
        token = create_access_token({"uid": creds.username})
        response.set_cookie(key=settings.JWT_ACCESS_COOKIE_NAME, value=token, max_age=10000000, httponly=True)
        return {"access_token": token}
    return HTTPException(401)


@router.get("/is_admin")
async def is_admin(request: Request):
    return decode_access_token(request.cookies[settings.JWT_ACCESS_COOKIE_NAME])["uid"] in settings.ADMINS


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.JWT_ACCESS_COOKIE_NAME)
