import aiofiles
import os


async def save_file(file_content, filepath):
    """Сохраняет загруженный файл асинхронно"""
    async with aiofiles.open(filepath, "wb") as out:
        await out.write(file_content)


async def save_text_file(file_content, filepath):
    """Сохраняет загруженный файл асинхронно"""
    async with aiofiles.open(filepath, "w") as out:
        await out.write(file_content)


async def read_file(filepath):
    """Читает информацию из файла и возвращает ее"""
    async with aiofiles.open(filepath, "r") as file:
        return await file.read()
