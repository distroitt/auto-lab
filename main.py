from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel
import aiofiles
import subprocess
app = FastAPI()

books = [
    {"id": 1,
     "title": "goida",
     "author": "negr"
    }
]

@app.post("/upload")
async def upload(file: UploadFile):
    async with aiofiles.open("testing/main.cpp", "wb") as out:
        content = await file.read()
        await out.write(content)
    subprocess.run("docker run --rm -t -v ~/auto-lab/testing/:/app lint main.cpp --quiet -- | awk '/warning:/{w++} /error:/{e++} END{print \"Предупреждений: \" w, \"Ошибок: \" e}'", shell=True)
    return {"OK"}


@app.get("/books", tags=["Книги"], summary="Получить все книги")
async def root():
    return books

@app.get("/books/{item_id}", tags=["Книги"], summary="Получить книгу")
async def goida(item_id: int):
    for book in books:
        if book["id"] == item_id:
            return book
    raise HTTPException(status_code=404)
    
class NewBook(BaseModel):
    title: str
    author: str

@app.post("/books")
def create_book(new_book: NewBook):
    books.append({
        "id":len(books)+1,
        "title":new_book.title,
        "author":new_book.author
    })
    return {"ok":True}
