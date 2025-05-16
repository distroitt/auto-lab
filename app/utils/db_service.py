from app.core.config import settings


def execute_db_request(sql: str, params: tuple = ()):
    response = settings.DB_CURSOR.execute(sql, params)
    settings.DB_CONNECTION.commit()
    return response
