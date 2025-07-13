import os
from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse
from app.core.config import settings
from app.utils.file_utils import read_file, save_text_file
from app.utils.tests_utils import check_valid_content

router = APIRouter()


@router.get("/labs")
async def labs():
    return [f for f in os.listdir("testing/configs") if f.startswith("LR")]


@router.get("/labs/{lab_name}/interface_name")
async def labs_interface_name(lab_name: str):
    return settings.INTERFACE_NAMES[lab_name]


@router.get("/labs/{lab_name}/tests")
async def read_item(lab_name: str):
    file_path = os.path.join(settings.TEST_CONFIGURATION_DIR, lab_name, 'testing.cpp')
    content = await read_file(file_path)
    return PlainTextResponse(content)


@router.get("/labs/clang-tidy")
async def read_item():
    file_path = os.path.join(settings.TEST_CONFIGURATION_DIR, '.clang-tidy')
    content = await read_file(file_path)
    return PlainTextResponse(content)


@router.get("/labs/{lab_name}/interface")
async def read_item(lab_name: str):
    file_path = os.path.join(settings.TEST_CONFIGURATION_DIR, lab_name, 'interface.h')
    content = await read_file(file_path)
    return PlainTextResponse(content)


@router.post("/labs/{lab_name}/interface")
async def apply_item(lab_name: str, request: Request):
    content = await request.body()
    text = content.decode('utf-8')
    file_path = os.path.join(settings.TEST_CONFIGURATION_DIR, lab_name, 'interface.h')
    await save_text_file(text, file_path)

@router.post("/labs/clang-tidy")
async def apply_item(request: Request):
    content = await request.body()
    text = content.decode('utf-8')
    file_path = os.path.join(settings.TEST_CONFIGURATION_DIR, '.clang-tidy')
    await save_text_file(text, file_path)

@router.post("/labs/{lab_name}/tests")
async def apply_item(lab_name, request: Request):
    content = await request.body()
    text = content.decode('utf-8')
    await check_valid_content(text)
    file_path = os.path.join(settings.TEST_CONFIGURATION_DIR, lab_name, 'testing.cpp')
    await save_text_file(text, file_path)