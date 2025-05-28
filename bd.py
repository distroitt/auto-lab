import sqlite3

con = sqlite3.connect('db.sqlite3')

cursor = con.cursor()
cursor.execute("""CREATE TABLE tasks
                (id TEXT PRIMARY KEY,
                lab_num TEXT,
                grade INTEGER,
                test_result TEXT,
                lint_result TEXT,
                owner INTEGER)
            """)