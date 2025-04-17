import aiofiles
import os

async def save_uploaded_file(file_content, filepath):
    """Сохраняет загруженный файл асинхронно"""
    async with aiofiles.open(filepath, "wb") as out:
        await out.write(file_content)
