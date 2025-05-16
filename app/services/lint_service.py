import asyncio
import re
from typing import Dict, List, Tuple
from app.services.task_service import update_task_result

LintWarning = Tuple[str, str, str, str, str, str, str, str]


async def run_lint_check(task_id: str, uid: str):
    """
    Основная функция для запуска линтинг-проверки.

    :param task_id: ID задачи
    :param uid: ID пользователя
    """
    try:
        print("START LINT CHECK")
        output = await execute_docker_command(task_id, uid, 4)
        idxs = await analyze_lint_output(output)
        # grouped_errors = await analyze_lint_output(output)
        # total_warnings = output.count("warning:")
        # formatted_result = await format_lint_results(grouped_errors, total_warnings)
        # short_result = f"Warnings: {output.count("warning:")} Errors: {output.count("error:")}"
        print(output)
        update_task_result(
            task_id,
            {
                "status": "completed", "lint_result": {"idxs": idxs},
            })


    except Exception as e:
        update_task_result(task_id,
                           {"status": "error",
                            "message": str(e)})


async def execute_docker_command(task_id: str, uid: str, lab_num: int):
    """
    Запускает Docker-контейнер для линтинг-проверки и возвращает вывод.

    :param task_id: ID задачи
    :param uid: ID пользователя
    :return: Стандартный вывод контейнера
    """
    docker_cmd = f"docker run --rm -t -v $(pwd)/testing/files/{uid}/{task_id}/source:/app/files:ro -v $(pwd)/testing/configs/.clang-tidy:/app/configs/.clang-tidy -v $(pwd)/testing/files/{uid}/{task_id}/source/res.yaml:/app/res.yaml distroit/lint"
    process = await asyncio.create_subprocess_shell(
        docker_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        shell=True
    )

    stdout, stderr = await process.communicate()
    print(stdout)
    if process.returncode != 0:
        update_task_result(task_id, {"status": "error", "message": stderr.decode()})
    else:
        return stdout.decode().strip()


async def analyze_lint_output(output: str):
    """
    Анализирует линтинг-вывод и группирует предупреждения.

    :param output: Стандартный вывод линтинг-проверки
    :return: Группировка предупреждений по типу
    """
    line_nums = []
    pattern = r'((\/\w+)+\/(\w+.cpp)):(\d+):(\d+): warning: ((.)+) \[([\w -]+)\]'
    matches = await asyncio.to_thread(re.findall, pattern, output)
    for match in matches:
        line_nums.append(match[3])
        print(match[2], match[3])
    return line_nums


async def format_lint_results(grouped_errors: Dict[str, List[LintWarning]], total_warnings: int):
    """
    Форматирует результат анализа предупреждений в удобный текстовый отчет.

    :param grouped_errors: Группировка предупреждений по типу
    :param total_warnings: Общее количество предупреждений
    :return: Форматированный текст отчета
    """
    result = [f"В файле найдено {total_warnings} предупреждений\n"]
    for error_type, errors in grouped_errors.items():
        result.append(f"🛑 Ошибка: {error_type}")
        for idx, match in enumerate(errors, 1):
            result.append(
                f"  {idx}. Файл: {match[2]}, строка: {match[3]}. Описание: {match[5]}"
            )
        result.append("\n")
    return "\n".join(result)
