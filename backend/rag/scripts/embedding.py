import os
import sys
import sqlite3
import json
import chromadb
from transformers import AutoTokenizer, AutoConfig
import torch

from rag.model import CustomBertForMTL  

DB_PATH     = "rag/db/depression_rag.db"
CHROMA_PATH = "rag/db/chroma_store"
MODEL_DIR = "./saved_model"
DEVICE    = "cpu"
BATCH_SIZE  = 32

# 토크나이저 로딩
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)

# 모델 로딩 (app.py와 동일한 방식)
config = AutoConfig.from_pretrained(MODEL_DIR)
model  = CustomBertForMTL(config)
state_dict = torch.load(
    f"{MODEL_DIR}/pytorch_model.bin",
    map_location=DEVICE
)
model.load_state_dict(state_dict)
model.to(DEVICE)
model.eval()

def build_metadata(label: int, patient_id: int, age: int, gender: str, feature: str) -> dict:
    """
    Chroma metadata는 scalar 타입 중심으로 저장한다.
    feature 원본은 JSON 문자열로 보존하고, 각 축은 feature_0~feature_11로 분리한다.
    """
    try:
        feature_values = json.loads(feature) if feature else []
    except json.JSONDecodeError:
        feature_values = []

    feature_values = (feature_values + [0] * 12)[:12]

    metadata = {
        "label": int(label),
        "patient_id": str(patient_id),
        "age": int(age),
        "gender": str(gender),
        "feature": json.dumps(feature_values),
    }

    metadata.update({
        f"feature_{idx}": int(value)
        for idx, value in enumerate(feature_values)
    })

    return metadata

def get_embeddings(texts: list[str]) -> list[list[float]]:
    inputs = tokenizer(
        texts,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    inputs.pop("token_type_ids", None)

    with torch.no_grad():
        outputs = model.bert(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"]
        )
    # [CLS] 토큰 벡터 (768차원)
    return outputs.pooler_output.tolist()

def build_chroma():
    conn   = sqlite3.connect(DB_PATH)
    cur    = conn.cursor()
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    collection = client.get_or_create_collection(
        name="documents",
        metadata={"hnsw:space": "cosine"}
    )

    # is_embedded = 0 인 행만 처리 (중단 후 재실행해도 이어서 진행됨)
    cur.execute("""
        SELECT id, text, label, patient_id, age, gender, feature
        FROM documents
        WHERE is_embedded = 0
        ORDER BY id
    """)
    rows = cur.fetchall()

    if not rows:
        print("새로 임베딩할 데이터가 없습니다.")
        return

    print(f"총 {len(rows)}건 임베딩 시작...")

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]

        ids        = [str(r[0]) for r in batch]
        texts      = [r[1]      for r in batch]
        metadatas  = [
            build_metadata(
                label=r[2],
                patient_id=r[3],
                age=r[4],
                gender=r[5],
                feature=r[6],
            )
            for r in batch
        ]

        embeddings = get_embeddings(texts)

        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )

        # 등록 완료 표시
        cur.executemany(
            "UPDATE documents SET is_embedded = 1 WHERE id = ?",
            [(r[0],) for r in batch]
        )
        conn.commit()

        print(f"  {min(i + BATCH_SIZE, len(rows))} / {len(rows)} 완료")

    conn.close()
    print("Chroma 등록 완료!")

if __name__ == "__main__":
    build_chroma()
