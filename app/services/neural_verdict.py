import os
from app.core.config import settings
import httpx


async def ai_stream(messages):
    """Возвращает сообщения от нейросети в виде потока сообщений"""
    ai_endpoint = settings.MAIN_ENDPOINT + "/admin/ai"

    async with httpx.AsyncClient() as client:
        try:
            async with client.stream("POST", ai_endpoint, json=messages, timeout=None) as response:
                if response.status_code != 200:
                    yield f"error: Ошибка запроса к AI с кодом: {response.status_code}"
                    return
                async for chunk in response.aiter_bytes():
                    yield chunk
        except Exception as e:
            yield f"error: Ошибка при вызове AI: {str(e)}"


def generate_ai_payload(directory) -> list:
    """Формирует запрос к нейросети"""
    messages = []
    for file in os.listdir(directory):
        if file.endswith(".cpp") or file.endswith(".h"):
            with open(f"{directory}/{file}", "r") as f:
                content = f.read()
            messages.append({
                'role': 'user',
                'content': [{
                    'type': 'text',
                    'text': f'Содержимое файла {file}: {content}'
                }]
            })

    messages.append({
        'role': 'user',
        'content': [{
            'type': 'text',
            'text': 'Проанализируй соответствие файла(ов) реализации с файлом интерфейса'
        }]
    })
    return messages
