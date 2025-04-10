from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiofiles
import os
import asyncio
import uuid
import time
from typing import Dict, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TASK_RESULTS: Dict[str, Optional[Dict]] = {}

async def run_lint_check(task_id: str, file_paths: list):
    try:
        docker_cmd = f"docker run --rm -t -v $(pwd)/testing/files/{task_id}:/app -v $(pwd)/testing/configs:/app/configs distroit/lint"
        process = await asyncio.create_subprocess_shell(
            docker_cmd + " | awk '/warning:/{w++} /error:/{e++} END{print \"Warnings: \" w, \"Errors: \" e}'" + f" && rm -rf $(pwd)/testing/files/{task_id}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            shell=True
        )
        
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            TASK_RESULTS[task_id] = {"status": "error", "message": stderr.decode()}
            return
        output = stdout.decode().strip()
        TASK_RESULTS[task_id] = {
            "status": "completed", 
            "result": output
        }
    except Exception as e:
        TASK_RESULTS[task_id] = {"status": "error", "message": str(e)}

@app.post("/upload")
async def upload_files(background_tasks: BackgroundTasks, files: list[UploadFile]):
    try:
        task_id = str(uuid.uuid4())
        os.makedirs(f"testing/files/{task_id}", exist_ok=True)
        file_paths = []
        for file in files:
            file_path = f"testing/files/{task_id}/{file.filename}"
            async with aiofiles.open(file_path, "wb") as out:
                content = await file.read()
                await out.write(content)
                file_paths.append(file_path)
                print(f"Uploaded: {file.filename}")

        TASK_RESULTS[task_id] = {"status": "processing"}
        
        background_tasks.add_task(run_lint_check, task_id, file_paths)
        
        return JSONResponse(content={"task_id": task_id})
        
    except Exception as e:
        print(f"Error during upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    if task_id not in TASK_RESULTS:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return JSONResponse(content=TASK_RESULTS[task_id])

@app.get("/tasks")
async def list_tasks():
    return JSONResponse(content=TASK_RESULTS)
