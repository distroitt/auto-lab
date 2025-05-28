import json
import sqlite3

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from fastapi.staticfiles import StaticFiles
from app.api import auth, tasks, labs, group
from admin.main import router as admin_router

from app.utils.db_utils import execute_db_request
from app.services.task_service import TASK_RESULTS
from app.utils.init_utils import init_database, set_site_url
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

init_database()
set_site_url()
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(tasks.router, prefix="/api", tags=["Tasks"])
app.include_router(labs.router, prefix="/api", tags=["Labs"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])

app.include_router(group.router, prefix="/api", tags=["Groups"])


@app.get("/")
async def main_page(request: Request):
    return FileResponse("app/templates/main.html")


@app.get("/upl_tasks")
async def upl_tasks(request: Request):
    return FileResponse("app/templates/upload_tasks.html")


@app.get("/tasks")
async def tasks(request: Request):
    return FileResponse("app/templates/tasks.html")


@app.get("/tasks/{user_id}")
async def tasks(request: Request, user_id: str):
    return FileResponse("app/templates/tasks.html")


@app.get("/group/{group_id}")
async def group(request: Request, group_id: int):
    return FileResponse("app/templates/group.html")
