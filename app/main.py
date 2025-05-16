import json
import sqlite3

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from fastapi.staticfiles import StaticFiles
from app.api import auth, tasks, labs, group
from admin.main import router as admin_router

from app.utils.db_service import execute_db_request
from app.services.task_service import TASK_RESULTS

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
sql = "SELECT * FROM tasks"

rows = execute_db_request(sql).fetchall()

for row in rows:
    # Пример структуры: (id, grade, test_result)
    task_id = row[0]  # id
    grade = row[1]  # grade
    test_result_json = row[2]  # test_result (JSON-строка)
    test_result_dict = json.loads(test_result_json)  # dict из JSON
    lint_result_json = row[3]
    lint_result_dict = json.loads(lint_result_json)
    print(task_id)
    TASK_RESULTS.update({f"{task_id}": {"status": "completed", "owner": f"{row[4]}", "grade": grade,
                                        "test_result": test_result_dict, "lint_result": lint_result_dict}})
app.mount("/static", StaticFiles(directory="static"), name="static")
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
