from pydantic import BaseModel


class TestRequest(BaseModel):
    file: str
    line: int
