import os
import sqlite3
from typing import List
from fastapi import WebSocket


class Settings:
    DEBUG: bool = False

    # JWT settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET", "goida") if not DEBUG else "goida"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_COOKIE_NAME: str = "my_secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 36000
    DB_NAME = 'db.sqlite3'
    DB_CONNECTION = sqlite3.connect(DB_NAME)
    DB_CURSOR = DB_CONNECTION.cursor()

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

    LIST_OF_GROUPS = ["453501", "453502", "453503", "453504", "453505"]

    HASHES = []

    MAX_FILES_SIZE = 5 * 1024 * 1024 #МB

    ADMINS = ["45350004", ]

    INTERFACE_NAMES = {
        "LR1": "HZ",
        "LR4": "IVector"
    }

    MAIN_ENDPOINT = os.getenv("MAIN_ENDPOINT")

    TEST_CONFIGURATION_DIR = "testing/configs"

    # File paths
    UPLOAD_DIR: str = "testing/files"

    connected_clients: List[WebSocket] = []


settings = Settings()
