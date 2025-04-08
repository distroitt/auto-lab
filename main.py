from fastapi import FastAPI, UploadFile
import aiofiles
import subprocess
app = FastAPI()

@app.post("/upload")
async def upload(files: list[UploadFile]):
    for file in files:
        async with aiofiles.open(f"testing/files/{file.filename}", "wb") as out:
            content = await file.read()
            await out.write(content)
    subprocess.run("docker run --rm -t -v ~/auto-lab/testing/:/app distroit/lint | awk '/warning:/{w++} /error:/{e++} END{print \"Warnings: \" w, \"Errors: \" e}' && rm testing/files/*", shell=True)
    
    return {"OK"}
