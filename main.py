from fastapi import FastAPI, HTTPException, Response, Request, Depends
from authx import AuthX, AuthXConfig
import jwt, datetime
from pydantic import BaseModel
import requests
app = FastAPI()

JWT_SECRET_KEY = "goida"
JWT_ALGORITHM = "HS256"
JWT_ACCESS_COOKIE_NAME = "my_secret"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class UserLogin(BaseModel):
    username: str
    password: str

def create_access_token(data: dict, expires_delta: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

@app.post("/auth")
async def root(creds: UserLogin, response: Response):
    data = {'username' : creds.username, 'password': creds.password}
    resp = requests.post(f"https://iis.bsuir.by/api/v1/auth/login", json=data)
    if resp.status_code == 200:
        token = create_access_token({"uid": creds.username})
        response.set_cookie(key=JWT_ACCESS_COOKIE_NAME, value=token, httponly=True)
        return {"access_token": token}
    return HTTPException(401)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(JWT_ACCESS_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    print(payload)
    return payload

@app.get("/protected")
async def protected(user: dict = Depends(get_current_user)):
    return {"uid": user.get("uid")}