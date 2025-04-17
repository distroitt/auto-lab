from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, tasks
from fastapi.templating import Jinja2Templates
import httpx
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)      
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(tasks.router, prefix="/api", tags=["Tasks"])

@app.get("/")
async def main_page(request: Request):
    return FileResponse("app/templates/main.html")
@app.get("/upl_tasks")
async def upl_tasks(request: Request):
    return FileResponse("app/templates/test.html")
@app.get("/tasks")
async def tasks(request: Request):
    return FileResponse("app/templates/tasks.html")

