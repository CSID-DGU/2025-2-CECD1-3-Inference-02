import sqlite3
import pandas as pd
import json
import ast

DB_PATH  = "rag/db/depression_rag.db"
CSV_PATH = "rag/data/training_depression_data.csv"

def parse_feature(raw) -> str:
    """
    depression_feature 컬럼을 JSON 문자열로 변환
    """
    if isinstance(raw, str):
        parsed = ast.literal_eval(raw)   # 문자열 → 파이썬 리스트
    else:
        parsed = list(raw)

    # 12개가 아닐 경우 패딩
    parsed = (parsed + [0] * 12)[:12]

    return json.dumps(parsed)            # 파이썬 리스트 → JSON 문자열

def load_csv():
    df = pd.read_csv(CSV_PATH)
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    inserted = 0

    for _, row in df.iterrows():
        feature_str = parse_feature(row["depression_feature"])

        cur.execute("""
            INSERT INTO documents (patient_id, text, label, age, gender, feature)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            int(row["id"]),         
            str(row["text"]),
            int(row["label"]),
            int(row["age"]),
            str(row["gender"]),
            feature_str
        ))
        inserted += 1

    conn.commit()
    conn.close()
    print(f"적재 완료: {inserted}건")

if __name__ == "__main__":
    load_csv()