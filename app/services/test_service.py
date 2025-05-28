import asyncio
import json
import os
import re
import aiofiles
from app.services.task_service import update_task_result
from app.utils.file_utils import save_file, read_file
from app.services.analyze_test_service import analyze_test_results


async def run_test(task_id: str, uid: str, interface_name: str, lab_num: str):
    """Запуск гугл тестов"""
    try:
        directory_path = f"testing/files/{uid}/{task_id}/source"
        impl_name, filename = await find_implementation(directory_path, interface_name)
        if not impl_name or not filename:
            update_task_result(task_id, {"test_result": "Неверное название интерфейса"})
        else:
            await save_file(f"IMPLEMENTATION_NAME={impl_name}\nREALIZATION_FILE={filename}".encode("utf-8"), f"{directory_path}/.env")
            output = await execute_docker_command(uid, task_id, lab_num)
            test_results = analyze_test_results(output)
            with open(directory_path + "/test.json", "w") as f:
                json.dump(test_results, f)
            update_task_result(task_id, {"test_result": test_results})
    except Exception as e:
        print(f"Ошибка: {e}")
        return {"error": str(e)}


async def find_implementation(directory_path: str, interface_name: str):
    """Поиск имени реализации интерфейса в файлах .cpp."""
    cpp_files = [f for f in os.listdir(directory_path) if f.endswith(".cpp")]
    pattern = re.compile(rf'class (\w+)\s*:\s*(?:public|private|protected)?\s*{interface_name}')
    for cpp_file in cpp_files:
        real_file = os.path.join(directory_path, cpp_file)
        result = re.search(pattern, await read_file(real_file))
        if result:
            return result.group(1), cpp_file
    return None, None


async def execute_docker_command(uid: str, task_id: str, lab_num: str):
    """Запуск Docker-контейнера и выполнение команды внутри."""
    docker_cmd = (
        f"docker run --rm -it --env-file=$(pwd)/testing/files/{uid}/{task_id}/source/.env  "
        f"-v $(pwd)/testing/files/{uid}/{task_id}/source:/test/files:ro -v $(pwd)/testing/configs/{lab_num}:/test/test_files -v $(pwd)/testing/configs/CMakeLists.txt:/test/CMakeLists.txt:ro distroit/test"
    )
    process = await asyncio.create_subprocess_shell(
        docker_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        shell=True
    )
    stdout, _ = await process.communicate()
    return stdout.decode().strip()
