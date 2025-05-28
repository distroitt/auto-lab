from typing import Dict, Optional
from app.core.config import settings
import uuid
import os

TASK_RESULTS: Dict[str, Optional[Dict]] = {}


def create_task(uid: str) -> str:
    """Создает новую задачу и возвращает её ID"""
    task_id = str(uuid.uuid4())
    TASK_RESULTS[task_id] = {"status": "processing", "owner": uid}
    return task_id

def restore_task(task_id: str):
    """Восстановление задачи из БД по ее ID"""
    TASK_RESULTS[task_id] = {}

def update_task_result(task_id: str, result: Dict, extra_param='') -> None:
    """Обновляет результат выполнения задачи"""
    if task_id in TASK_RESULTS:
        if extra_param:
            TASK_RESULTS[task_id][extra_param].update(result)
        else:
            TASK_RESULTS[task_id].update(result)


def get_task(task_id: str) -> Optional[Dict]:
    """Возвращает информацию о задаче по ID"""
    return TASK_RESULTS.get(task_id)


def get_user_tasks(uid: str) -> Dict[str, Dict]:
    """Возвращает все задачи пользователя"""
    user_tasks = {}
    for task_id, task_data in TASK_RESULTS.items():
        if task_data.get("owner") == uid:
            user_tasks[task_id] = task_data
    return user_tasks


def create_task_directory(uid: str, task_id: str) -> str:
    """Создает директорию для файлов задачи"""
    task_dir = f"{settings.UPLOAD_DIR}/{uid}/{task_id}/source/"
    os.makedirs(task_dir, exist_ok=True)
    return task_dir
