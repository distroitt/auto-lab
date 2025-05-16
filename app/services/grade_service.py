import json
import yaml
import time
from app.services.task_service import get_task, update_task_result
from app.utils.db_service import execute_db_request


async def get_grade(task_id: str, uid: str):
    while get_task(task_id)["status"] != "completed":
        time.sleep(1)

    MAX_SCORE = 10
    TEST_MAX_SCORE = 9  # Тесты дают максимум 9 баллов
    CLEAN_LINTER_BONUS = 1  # Бонус за чистый линтер
    MAX_LINTER_PENALTY = 1  # Максимальный штраф за линтер

    # --- Результаты тестов ---
    try:
        with open(f"testing/files/{uid}/{task_id}/source/test.json") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Файл test.json отсутствует!")
        return
    except json.JSONDecodeError as e:
        print(f"Ошибка чтения JSON из test.json: {e}")
        return

    total_tests = data.get("total", 0)
    failed_tests = data.get("failed", 0)
    passed_tests = total_tests - failed_tests

    # --- Результаты линтера ---
    try:
        with open(f"testing/files/{uid}/{task_id}/source/res.yaml") as f:
            clang_tidy_report = yaml.safe_load(f) or {}
    except FileNotFoundError:
        print("Файл res.yaml отсутствует!")
        clang_tidy_report = {}
    except yaml.YAMLError as e:
        print(f"Ошибка чтения YAML из res.yaml: {e}")
        clang_tidy_report = {}

    diagnostics = clang_tidy_report.get('Diagnostics', [])
    if not diagnostics:
        print("Ошибок линтера не найдено. Возможно, файл res.yaml пуст.")

    # Категории и веса линтера
    LINTER_WEIGHTS = {
        'critical': 1.0,
        'performance': 0.7,
        'security': 1.0,
        'readability': 0.25,
        'style': 0.1,
        'other': 0.5,
    }

    def get_linter_category(check_name):
        for prefix, category in LINTER_WEIGHTS.items():
            if check_name.startswith(prefix):
                return category
        return 'other'

    linter_penalty = 0
    for diag in diagnostics:
        check_name = diag.get('DiagnosticName', '')
        level = diag.get('Level', '').lower()
        category = get_linter_category(check_name)

        weight = LINTER_WEIGHTS.get(category, 0.5)
        if level == 'warning':
            weight *= 0.5  # Уменьшенный штраф за предупреждения
        linter_penalty += weight

    # Ограничение штрафов
    linter_penalty = min(linter_penalty, MAX_LINTER_PENALTY)
    linter_penalty = round(linter_penalty, 2)

    # --- Оценка за тесты ---
    test_score = max(TEST_MAX_SCORE - failed_tests, 0)

    # --- Общая оценка ---
    score = test_score

    # Бонус за линтер без ошибок
    if linter_penalty == 0:
        score += CLEAN_LINTER_BONUS
    elif linter_penalty <= 0.5:
        score += CLEAN_LINTER_BONUS * 0.75
    elif linter_penalty <= 1.0:
        score += CLEAN_LINTER_BONUS * 0.5

    # Учет штрафов
    score -= linter_penalty

    # Окончательная корректировка
    score = round(score, 2)
    score = min(MAX_SCORE, max(0, score))

    # --- Лог результатов ---
    print(f"""\
        Итоговая оценка: {score}/10

        == Отчёт ==
        Google Test:        {passed_tests}/{total_tests} тестов прошло, {failed_tests} упало
        Линтер замечаний:   {len(diagnostics)} (штраф: {linter_penalty})
    """)

    if diagnostics:
        print("По категориям замечаний:")
        for diag in diagnostics:
            category = get_linter_category(diag.get('DiagnosticName', ''))
            print(f"  {category}: {diag.get('DiagnosticName', '')}")

    update_task_result(task_id, {"grade": score, "test_result": data})
    update_task_result(task_id, clang_tidy_report, "lint_result")
    lint_result = json.dumps(get_task(task_id)["lint_result"], ensure_ascii=False, indent=2)
    test_result = json.dumps(data)
    sql = "INSERT INTO tasks (id, grade, test_result, lint_result, owner) VALUES (?, ?, ?, ?, ?)"
    execute_db_request(sql, (task_id, score, test_result, lint_result, uid))
