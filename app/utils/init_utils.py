import json
import re

from app.services.task_service import update_task_result, restore_task
from app.utils.db_utils import execute_db_request
from app.core.config import settings


def init_database():
    """Инициализирует результаты всех посылок из базы данных"""
    sql = "SELECT * FROM tasks"
    rows = execute_db_request(sql).fetchall()
    for row in rows:
        task_id = row[0]
        lab_num = row[1]
        grade = row[2]
        test_result_json = row[3]
        test_result_dict = json.loads(test_result_json)
        lint_result_json = row[4]
        lint_result_dict = json.loads(lint_result_json)
        restore_task(task_id)
        update_task_result(task_id, {"status": "completed", "lab_num": lab_num, "owner": f"{row[5]}", "grade": grade,
                                     "test_result": test_result_dict, "lint_result": lint_result_dict})


def set_site_url():
    """Устанавливает переменную среды для фронтенда"""
    with open("static/env.js", "r") as f:
        data = f.read()
        f.close()
    pattern = r'["\'](.*?)["\']'
    with open("static/env.js", "w") as f:
        f.write(re.sub(pattern, f'"{settings.MAIN_ENDPOINT}"', data))
        f.close()
