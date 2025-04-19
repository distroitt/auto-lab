import os
import subprocess
import re
from fastapi import FastAPI

app = FastAPI()

@app.post("/")
async def root(interfaceName: str):
    env_file = open(".env", "w")
    directory_path = "testing"
    pattern = re.compile(rf'class (\w+)\s*:\s*(?:public|private|protected)?\s*{interfaceName}')
    cpp_files = [f for f in os.listdir(directory_path) if f.endswith(".cpp")]
    for cpp_file in cpp_files:
        real_file = os.path.join(directory_path, cpp_file)
        with open(real_file, "r") as file:
             lines = file.readlines()
             r = "".join(lines)
             result = re.search(pattern,r)
             if result:
                 filename = cpp_file
                 implName = result.group(1)
   
    if not implName or not filename:
        print("Неверное название интерфейса")
    else:
        env_file.write(f"IMPLEMENTATION_NAME={implName}\nREALIZATION_FILE={filename}")
        env_file.close() 
        subprocess.run("docker run -it --env-file=.env -v test:/test/googletest -v ~/auto-lab/testing/:/test distroit/test", shell=True)