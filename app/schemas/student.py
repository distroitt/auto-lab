from pydantic import BaseModel


class Student(BaseModel):
    username: str
    name: str
    surname: str
    group_id: str
