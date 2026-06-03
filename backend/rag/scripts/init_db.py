import sqlite3

DB_PATH = "rag/db/depression_rag.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id        TEXT,
            text              TEXT    NOT NULL,
            label             INTEGER,
            age               INTEGER,
            gender            TEXT,
            feature           TEXT,           -- "[1,0,0,1,...]" 12차원 JSON 문자열
            counselor_reply   TEXT,           -- 상담사 응답
            intervention_type TEXT,           -- 개입 유형 (쉼표 구분)
            is_embedded       INTEGER DEFAULT 0
        )
    """)

    # 기존 DB에 신규 컬럼이 없는 경우 마이그레이션
    for col, coltype in [
        ("counselor_reply",   "TEXT"),
        ("intervention_type", "TEXT"),
    ]:
        try:
            cur.execute(f"ALTER TABLE documents ADD COLUMN {col} {coltype}")
        except sqlite3.OperationalError:
            pass  # 이미 존재

    cur.execute("CREATE INDEX IF NOT EXISTS idx_label   ON documents(label)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_patient ON documents(patient_id)")

    conn.commit()
    conn.close()
    print("DB 초기화 완료")

if __name__ == "__main__":
    init_db()