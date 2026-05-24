import sqlite3

DB_PATH = "rag/db/depression_rag.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id  INTEGER,
            text        TEXT    NOT NULL,
            label       INTEGER,
            age         INTEGER,
            gender      TEXT,
            feature     TEXT,       -- "[2,0,0,1,0,...]" JSON 문자열
            is_embedded INTEGER DEFAULT 0  -- Chroma 등록 여부
        )
    """)

    # 검색 속도를 위한 인덱스
    cur.execute("CREATE INDEX IF NOT EXISTS idx_label ON documents(label)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_patient ON documents(patient_id)")

    conn.commit()
    conn.close()
    print("DB 초기화 완료")

if __name__ == "__main__":
    init_db()