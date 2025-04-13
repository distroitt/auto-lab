import re
from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiofiles
import os
import asyncio
import uuid
import time
from fastapi import FastAPI, HTTPException, Response, Request, Depends
from authx import AuthX, AuthXConfig
import jwt, datetime
from pydantic import BaseModel
import requests
from typing import Dict, Optional

app = FastAPI()
origins = [
    "https://localhost",
    "https://localhost:8000",
    "https://localhost:8080",
    "https://127.0.0.1",
    "https://127.0.0.1:8000",
    "http://127.0.0.1:9000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEBUG = True

if not DEBUG:
    JWT_SECRET_KEY = os.getenv("JWT_SECRET")
else:
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
    return payload

TASK_RESULTS: Dict[str, Optional[Dict]] = {}

async def run_lint_check(task_id: str, uid: str):
    try:
        docker_cmd = f"docker run --rm -t -v $(pwd)/testing/files/{uid}/{task_id}:/app/files -v $(pwd)/testing/configs:/app/configs distroit/lint"
        process = await asyncio.create_subprocess_shell(
            docker_cmd + f"; rm -rf $(pwd)/testing/files/{uid}/{task_id}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            shell=True
        )
        
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            TASK_RESULTS[task_id] = {"status": "error", "message": stderr.decode()}
            return
        output = stdout.decode().strip()
        pattern = r'((\/\w+)+\/(\w+.cpp)):(\d+):(\d+): warning: ((.)+) \[([\w -]+)\]'
        matches = await asyncio.to_thread(re.findall, pattern, output)
        result = []
        result.append(f"В файле {len(matches)} предупреждений")
        for match in matches:
            result.append(f"В файле {match[2]} в строке {match[3]} ошибка {match[7]}. Описание: {match[5]}")
        TASK_RESULTS[task_id] = {
            "status": "completed",
            "owner" : TASK_RESULTS[task_id]["owner"], 
            "result": result
        }
    except Exception as e:
        TASK_RESULTS[task_id] = {"status": "error", "message": str(e)}

@app.post("/upload")
async def upload_files(background_tasks: BackgroundTasks, files: list[UploadFile], user: dict = Depends(get_current_user)):
    try:
        uid = user.get("uid")
        task_id = str(uuid.uuid4())
        os.makedirs(f"testing/files/{uid}/{task_id}", exist_ok=True)
        for file in files:
            file_path = f"testing/files/{uid}/{task_id}/{file.filename}"
            async with aiofiles.open(file_path, "wb") as out:
                content = await file.read()
                await out.write(content)
                print(f"Uploaded: {file.filename}")

        TASK_RESULTS[task_id] = {"status": "processing", "owner": uid}
        
        background_tasks.add_task(run_lint_check, task_id, uid)
        
        return JSONResponse(content={"task_id": task_id})
        
    except Exception as e:
        print(f"Error during upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/task/{task_id}")
async def get_task_status(task_id: str, user: dict = Depends(get_current_user)):
    if task_id not in TASK_RESULTS:
        raise HTTPException(status_code=404, detail="Task not found")
    if TASK_RESULTS[task_id]["owner"] == user.get("uid"):
        return JSONResponse(content=TASK_RESULTS[task_id])
    else:
        raise HTTPException(status_code=404, detail="У вас нет доступа к этой задаче")

@app.get("/tasks")
async def list_tasks(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    content = {}
    for task in TASK_RESULTS:
        if TASK_RESULTS[task]["owner"] == uid:
            content[task] = TASK_RESULTS[task]
    return JSONResponse(content=content)
