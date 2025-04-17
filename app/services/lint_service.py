import asyncio
import re
from app.services.task_service import update_task_result
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
            update_task_result(task_id, {"status": "error", "message": stderr.decode()})
            return
        
        output = stdout.decode().strip()
        pattern = r'((\/\w+)+\/(\w+.cpp)):(\d+):(\d+): warning: ((.)+) \[([\w -]+)\]'
        matches = await asyncio.to_thread(re.findall, pattern, output)
        from collections import defaultdict

        grouped_errors = defaultdict(list)
        for match in matches:
            grouped_errors[match[7]].append(match)

        result = []
        result.append(f"В файле найдено {len(matches)} предупреждений:\n")

        for error_type, errors in grouped_errors.items():
            result.append(f"🛑 Ошибка: {error_type}")
            for idx, match in enumerate(errors, 1):
                result.append(f"  {idx}. Файл: {match[2]}, строка: {match[3]}. Описание: {match[5]}")
            result.append("\n")
        short_result = f"Warnings: {output.count("warning:")} Errors: {output.count("error:")}"
        final_output = result
        update_task_result(task_id, 
            {"status": "completed",
             "short_result": short_result,
            "result": final_output})
    except Exception as e:
        update_task_result(task_id, 
            {"status": "error",
            "message": str(e)})