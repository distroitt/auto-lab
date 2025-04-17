import os
from typing import List

from fastapi import WebSocket

class Settings:
    DEBUG: bool = True
    
    # JWT settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET", "goida") if not DEBUG else "goida"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_COOKIE_NAME: str = "my_secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 180
    
    # CORS settings
    ORIGINS = [
        "https://localhost",
        "https://localhost:8000",
        "https://localhost:8080",
        "https://127.0.0.1",
        "https://127.0.0.1:8000",
        "http://127.0.0.1:9000"
    ]
    
    # API URLs
    BSUIR_AUTH_URL: str = "https://iis.bsuir.by/api/v1/auth/login"
    
    # File paths
    UPLOAD_DIR: str = "testing/files"

    connected_clients: List[WebSocket] = []

settings = Settings()
