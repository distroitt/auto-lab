import os
from fastapi import Body, Depends, HTTPException
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
import admin.services.auth_browser as auth_browser
from app.core.dependencies import get_current_user
from app.core.config import settings
from admin.services.ai import generate_ai_payload, event_stream

router = APIRouter()


@router.get("/")
async def root(user: dict = Depends(get_current_user)):
    if user.get("uid") not in settings.ADMINS:
        raise HTTPException(status_code=404, detail="Вы не админ")
    return FileResponse("admin/templates/admin.html")


@router.post("/provide-code")
async def provide_code_endpoint(code: str = Body(...)):
    auth_browser.reauth_code_value = code
    auth_browser.reauth_code_event.set()
    return {"status": "ok"}


@router.get("/labs")
async def labs():
    return [f for f in os.listdir("testing/configs") if f.startswith("LR")]


@router.post("/ai")
async def ai(request: Request):
    payload = generate_ai_payload(await request.json())

    return StreamingResponse(event_stream(payload), media_type="text/plain")
