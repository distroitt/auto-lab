from fastapi import HTTPException
from fastapi import APIRouter, Depends
from app.core.config import settings
from app.utils.db_utils import execute_db_request
from app.schemas.student import Student
from app.core.dependencies import get_current_user, is_admin

router = APIRouter()


@router.get("/groups")
async def groups():
    return settings.LIST_OF_GROUPS


@router.get("/group/{group_id}")
async def get_group(group_id: str, user: dict = Depends(get_current_user)) -> list[Student]:
    if not is_admin(user):
        raise HTTPException(status_code=401)
    sql = "SELECT * FROM students WHERE group_id = ?"
    response = execute_db_request(sql, (group_id,))
    result = response.fetchall()
    users = [Student(username=row[0], name=row[1], surname=row[2], group_id=row[3]) for row in result]
    if not users:
        raise HTTPException(status_code=404)
    return users
