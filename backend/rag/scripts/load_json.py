"""
JSON 상담 데이터 → RAG DB 적재 스크립트

실행: python -m rag.scripts.load_json  (backend/ 디렉터리에서)
"""

import os
import json
import sqlite3
import glob

DB_PATH  = "rag/db/depression_rag.db"
DATA_DIR = "rag/data/source_data"

# 12차원 feature 벡터 순서
FEATURE_KEYS = [
    'depressive_mood',
    'worthlessness',
    'guilt',
    'impaired_cognition',
    'suicidal',
    'anhedonia',
    'psychomotor_changes',
    'sleep_disturbance',
    'fatigue',
    'trauma_experience',
    'negative_self-image',
    'emotional_requlation',
]

INTERVENTION_LABELS = {
    'sympathy_support':                       '공감/지지',
    'clarification_reflection':               '명료화/반영',
    'cognitive_restructuring':                '인지 재구조화',
    'information_provision':                  '정보 제공',
    'goal_setting':                           '목표 설정',
    'behavioral_intervention':                '행동 개입',
    'training_of_coping_skills':              '대처 기술 훈련',
    'emotional_regulation_education_training':'정서 조절 교육',
}


def process_file(path: str) -> list[dict]:
    with open(path, encoding='utf-8') as f:
        data = json.load(f)

    age        = data.get('age')
    gender     = data.get('gender')
    depression = min(int(data.get('depression', 0)), 3)  # 3 초과는 3으로
    paragraphs = data.get('paragraph', [])
    patient_id = str(data.get('id', os.path.splitext(os.path.basename(path))[0]))

    records = []

    for i, para in enumerate(paragraphs):
        if para.get('paragraph_speaker') != '내담자':
            continue

        text = str(para.get('paragraph_text', '')).strip()
        if len(text) < 10:
            continue

        # 증상 feature 벡터 (12차원)
        feature = [int(para.get(k, 0)) for k in FEATURE_KEYS]
        if sum(feature) == 0:
            continue  # 증상이 없는 발화는 RAG에 불필요

        # 다음 상담사 발화 탐색
        counselor_reply   = ''
        intervention_type = ''
        for j in range(i + 1, len(paragraphs)):
            if paragraphs[j].get('paragraph_speaker') == '상담사':
                counselor_reply = str(paragraphs[j].get('paragraph_text', '')).strip()
                types = [label for key, label in INTERVENTION_LABELS.items()
                         if paragraphs[j].get(key, 0) == 1]
                intervention_type = ', '.join(types)
                break

        records.append({
            'patient_id':        patient_id,
            'text':              text,
            'label':             depression,
            'age':               int(age) if age is not None else None,
            'gender':            str(gender) if gender else None,
            'feature':           json.dumps(feature),
            'counselor_reply':   counselor_reply,
            'intervention_type': intervention_type,
        })

    return records


def load_json():
    json_files = sorted(glob.glob(os.path.join(DATA_DIR, '*.json')))
    if not json_files:
        print(f"[load_json] JSON 파일 없음: {DATA_DIR}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # 이미 적재된 patient_id 목록 조회
    cur.execute("SELECT DISTINCT patient_id FROM documents")
    existing_ids = {row[0] for row in cur.fetchall()}
    print(f"기존 적재된 환자 수: {len(existing_ids)}명")

    total_inserted = 0
    total_files    = len(json_files)
    skipped_error  = 0
    skipped_dup    = 0

    for file_idx, path in enumerate(json_files, 1):
        try:
            records = process_file(path)
        except Exception as e:
            print(f"  [오류] {os.path.basename(path)}: {e}")
            skipped_error += 1
            continue

        if not records:
            continue

        # 첫 레코드의 patient_id로 중복 여부 확인
        if records[0]['patient_id'] in existing_ids:
            skipped_dup += 1
            continue

        for r in records:
            cur.execute("""
                INSERT INTO documents
                    (patient_id, text, label, age, gender, feature,
                     counselor_reply, intervention_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                r['patient_id'], r['text'],   r['label'],  r['age'],
                r['gender'],     r['feature'], r['counselor_reply'],
                r['intervention_type'],
            ))
            total_inserted += 1

        existing_ids.add(records[0]['patient_id'])

        if file_idx % 50 == 0 or file_idx == total_files:
            conn.commit()
            print(f"  {file_idx}/{total_files} 완료 (신규 {total_inserted}건, 중복 건너뜀 {skipped_dup}건, 오류 {skipped_error}건)")

    conn.commit()
    conn.close()
    print(f"\n적재 완료: {total_files}개 파일, {total_inserted}건 삽입, 중복 건너뜀 {skipped_dup}건, 오류 {skipped_error}건")


if __name__ == '__main__':
    load_json()
