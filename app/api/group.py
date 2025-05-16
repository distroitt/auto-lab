from fastapi import APIRouter
from app.core.config import settings
from app.utils.db_service import execute_db_request
from app.schemas.student import Student

router = APIRouter()


@router.get("/groups")
async def groups():
    return settings.LIST_OF_GROUPS


@router.get("/group/{group_id}")
async def get_group(group_id: str) -> list[Student]:
    sql = "SELECT * FROM students WHERE group_id = ?"
    response = execute_db_request(sql, (group_id,))
    result = response.fetchall()
    users = [Student(username=row[0], name=row[1], surname=row[2], group_id=row[3]) for row in result]
    return users
