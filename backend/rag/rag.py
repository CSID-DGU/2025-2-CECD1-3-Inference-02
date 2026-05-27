import json
import sqlite3
import torch
import chromadb

DB_PATH     = "rag/db/depression_rag.db"
CHROMA_PATH = "rag/db/chroma_store"

from rag.model import model, tokenizer

DEVICE = "cpu"

# =========================
# Chroma 클라이언트
# =========================
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection    = chroma_client.get_collection("documents")

print("[RAG] Chroma 연결 완료")


# =========================
# 임베딩 생성
# =========================
def embed_text(text: str) -> list[float]:
    """단일 텍스트 → 768차원 벡터"""
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )
    inputs.pop("token_type_ids", None)
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        # forward() 거치지 않고 BERT 인코더만 직접 호출
        outputs = model.bert(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"]
        )

    return outputs.pooler_output.squeeze().tolist()


def _normalize_feature(feature: list[int] | str | None) -> list[float] | None:
    if feature is None:
        return None

    if isinstance(feature, str):
        try:
            feature = json.loads(feature)
        except json.JSONDecodeError:
            return None

    values = [float(v) for v in feature]
    return (values + [0.0] * 12)[:12]


def _cosine_similarity(a: list[float] | None, b: list[float] | None) -> float | None:
    if not a or not b:
        return None

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5

    if norm_a == 0 or norm_b == 0:
        return None

    return dot / (norm_a * norm_b)


def _age_similarity(user_age: int | None, case_age: int | None) -> float | None:
    if user_age is None or case_age is None:
        return None

    # 40세 이상 차이는 사실상 유사하지 않다고 본다.
    return max(0.0, 1.0 - abs(user_age - case_age) / 40.0)


def _gender_similarity(user_gender: str | None, case_gender: str | None) -> float | None:
    if not user_gender or not case_gender:
        return None

    normalized_user = "남" if user_gender in ("남", "남성") else "여"
    normalized_case = "남" if case_gender in ("남", "남성") else "여"

    return 1.0 if normalized_user == normalized_case else 0.0


def _level_similarity(target_level: int | None, case_label: int | None) -> float | None:
    if target_level is None or case_label is None:
        return None

    return max(0.0, 1.0 - abs(target_level - case_label) / 3.0)


def _rerank_score(
    text_similarity: float,
    *,
    age_score: float | None = None,
    gender_score: float | None = None,
    feature_score: float | None = None,
    level_score: float | None = None,
) -> tuple[float, dict]:
    components = {"text": text_similarity}
    weights = {"text": 0.60}

    if age_score is not None:
        components["age"] = age_score
        weights["age"] = 0.10
    if gender_score is not None:
        components["gender"] = gender_score
        weights["gender"] = 0.10
    if feature_score is not None:
        components["feature"] = feature_score
        weights["feature"] = 0.15
    if level_score is not None:
        components["level"] = level_score
        weights["level"] = 0.05

    total_weight = sum(weights.values())
    score = sum(components[key] * weights[key] for key in components) / total_weight

    return score, {
        key: round(value, 4)
        for key, value in components.items()
    }


# =========================
# 유사 발화 검색
# =========================
def retrieve(
    query: str,
    top_k: int = 5,
    min_label: int = None,
    age: int = None,
    gender: str = None,
    user_feature: list[int] = None,
    target_level: int = None,
    candidate_k: int = None
) -> list[dict]:
    """
    query        : 사용자 발화 텍스트
    top_k        : 최종 반환할 유사 사례 수
    min_label    : 이 값 이상의 label만 검색 (None이면 전체)
    age          : 현재 사용자 나이
    gender       : 현재 사용자 성별 ("남"/"여", "남성"/"여성")
    user_feature : 현재 사용자 증상 feature 벡터(12차원)
    target_level : 현재 사용자 우울 위험도/강도(0~3)
    candidate_k  : Chroma에서 넓게 가져올 후보 수
    """

    query_embedding = embed_text(query)
    candidate_k = candidate_k or max(top_k * 6, 30)

    # Chroma 필터 조건
    where = {"label": {"$gte": min_label}} if min_label is not None else None

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=candidate_k,
        where=where,
        include=["documents", "metadatas", "distances"]
    )

    ids       = [int(i) for i in results["ids"][0]]
    distances = results["distances"][0]

    if not ids:
        return []

    # SQLite에서 원문 상세 조회
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    placeholders = ",".join(["?"] * len(ids))
    cur.execute(f"""
        SELECT id, text, label, age, gender, feature
        FROM documents
        WHERE id IN ({placeholders})
    """, ids)
    rows = {r[0]: r for r in cur.fetchall()}
    conn.close()

    user_feature = _normalize_feature(user_feature)

    # Chroma 검색 후보를 사용자 조건/증상 패턴까지 반영해 재정렬한다.
    output = []
    for uid, dist in zip(ids, distances):
        if uid not in rows:
            continue
        r = rows[uid]
        text_similarity = 1 - dist
        case_feature = _normalize_feature(r[5])
        score, score_detail = _rerank_score(
            text_similarity,
            age_score=_age_similarity(age, r[3]),
            gender_score=_gender_similarity(gender, r[4]),
            feature_score=_cosine_similarity(user_feature, case_feature),
            level_score=_level_similarity(target_level, r[2]),
        )

        output.append({
            "text":       r[1],
            "label":      r[2],
            "age":        r[3],
            "gender":     r[4],
            "feature":    case_feature or [],
            "similarity": round(text_similarity, 4),   # 코사인 거리 → 유사도
            "score":      round(score, 4),
            "score_detail": score_detail,
        })

    return sorted(output, key=lambda item: item["score"], reverse=True)[:top_k]
