import sqlite3

con = sqlite3.connect('db.sqlite3')

cursor = con.cursor()
cursor.execute("""CREATE TABLE students
                (id TEXT PRIMARY KEY, 
                name TEXT,
                surname TEXT,
                group_id TEXT
                )
            """)