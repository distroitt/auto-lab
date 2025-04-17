from typing import List
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.services.task_service import create_task, create_task_directory, get_user_tasks, get_task
from app.utils.file_utils import save_uploaded_file
from app.services.lint_service import run_lint_check
router = APIRouter()

@router.post("/upload")
async def upload_files(background_tasks: BackgroundTasks, files: list[UploadFile], user: dict = Depends(get_current_user)):
    try:
        uid = user.get("uid")
        task_id = create_task(uid)
        task_dir = create_task_directory(uid, task_id)
        for file in files:
            file_path = f"{task_dir}/{file.filename}"
            content = await file.read()
            await save_uploaded_file(content, file_path)

        background_tasks.add_task(run_lint_check, task_id, uid)
        
        return JSONResponse(content={"task_id": task_id})
        
    except Exception as e:
        print(f"Error during upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/tasks")
async def list_tasks(request: Request, user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    user_tasks = get_user_tasks(uid)
    return user_tasks                                                                                                                                                                               
@router.get("/task/{task_id}")
async def get_task_status(task_id: str, user: dict = Depends(get_current_user)):
    task_status = get_task(task_id)
    return task_status