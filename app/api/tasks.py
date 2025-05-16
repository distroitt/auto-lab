import os
import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile, Query
from fastapi.responses import JSONResponse, StreamingResponse
from app.schemas.test import TestRequest
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.services.task_service import create_task, create_task_directory, get_user_tasks, get_task
from app.utils.file_utils import save_file
from app.services.lint_service import run_lint_check
from app.services.grade_service import get_grade
from app.services.test_service import run_test
from app.services.analyze_test_service import extract_test_block, analyze_test_results
from app.utils.hash_utils import hash_file
from app.services.neural_verdict import generate_ai_payload, ai_stream

router = APIRouter()


@router.post("/tasks/get_neural_verdict")
async def get_neural_verdict(task_id: str, user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    directory = f"testing/files/{uid}/{task_id}/source"
    messages = generate_ai_payload(directory)

    return StreamingResponse(
        ai_stream(messages),
        media_type="text/plain"
    )


@router.post("/upload")
async def upload_files(interface_name: str, background_tasks: BackgroundTasks, files: list[UploadFile],
                       user: dict = Depends(get_current_user)):
    try:
        uid = user.get("uid")
        task_id = create_task(uid)
        task_dir = create_task_directory(uid, task_id)
        for file in files:
            content = await file.read()
            if file.filename.endswith(".cpp"):
                if '#include "interface.h"' not in content.decode("utf-8"):
                    content = '#include "interface.h"\n'.encode('utf-8') + content
            await save_file(content, f"{task_dir}/{file.filename}")
            if file.filename.endswith(".cpp"):
                hash_value = hash_file(task_dir + "/" + file.filename)
                if hash_value in settings.HASHES:
                    raise HTTPException(status_code=404, detail="Такой файл уже был отправлен кем-либо)")
                else:
                    settings.HASHES.append(hash_value)
        await save_file(b"", f"{task_dir}/res.yaml")

        background_tasks.add_task(run_test, task_id, uid, interface_name)
        background_tasks.add_task(run_lint_check, task_id, uid)
        background_tasks.add_task(get_grade, task_id, uid)
        return JSONResponse(content={"task_id": task_id})

    except Exception as e:
        raise HTTPException(status_code=500, detail="Ошибка при загрузке файла")


@router.post('/tasks/get_test_block')
def get_test_block(req: TestRequest):
    try:
        with open("testing/configs/LR4/testing.cpp", encoding='utf-8') as f:
            lines = f.readlines()
        test_code = extract_test_block(lines, req.line)
        return {'test_code': test_code}
    except Exception as e:
        return {'test_code': 'Ошибка: ' + str(e)}


@router.post("/tasks/analyze_tests")
async def analyze_tests(request: Request):
    test_result_bytes = await request.body()
    test_result_str = test_result_bytes.decode('utf-8')
    if isinstance(test_result_str, list):
        test_result_str = '\n'.join(test_result_str)
    return analyze_test_results(test_result_str)


@router.get("/tasks")
async def list_tasks(user: dict = Depends(get_current_user), uid: str | None = None):
    current_uid = user.get("uid")
    if current_uid in settings.ADMINS and uid:
        user_tasks = get_user_tasks(uid)
    else:
        user_tasks = get_user_tasks(current_uid)
    return user_tasks


@router.get("/task/{task_id}")
async def get_task_status(task_id: str, user: dict = Depends(get_current_user)):
    user_tasks = get_user_tasks(user.get("uid"))
    if task_id in user_tasks.keys():
        task_status = get_task(task_id)
        return task_status
    else:
        raise HTTPException(status_code=404, detail="Нет доступа к этой задаче")
