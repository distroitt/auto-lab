from pydantic import BaseModel


class TestRequest(BaseModel):
    lab_num: str
    line: int