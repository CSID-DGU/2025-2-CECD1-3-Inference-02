"""
RAG 전체 초기화 스크립트 (기존 DB 초기화 후 재구성)

rag/data/source_data/에 json 파일 필수
실행: python -m rag.scripts.setup_rag  (backend/ 디렉터리에서)
"""

import os
import shutil

DB_PATH     = "rag/db/depression_rag.db"
CHROMA_PATH = "rag/db/chroma_store"

from rag.scripts.init_db   import init_db
from rag.scripts.load_json import load_json
from rag.scripts.embedding import build_chroma


def reset():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"SQLite 삭제: {DB_PATH}")
    if os.path.exists(CHROMA_PATH):
        shutil.rmtree(CHROMA_PATH)
        print(f"Chroma 삭제: {CHROMA_PATH}")


def setup_rag():
    print("=" * 50)
    print("RAG 전체 초기화 시작")
    print("=" * 50)

    print("\n[1/4] 기존 DB 초기화...")
    reset()

    print("\n[2/4] DB 스키마 생성...")
    init_db()

    print("\n[3/4] JSON 데이터 적재...")
    load_json()

    print("\n[4/4] 임베딩 생성 및 Chroma 등록...")
    build_chroma()

    print("\n" + "=" * 50)
    print("RAG 초기화 완료")
    print("=" * 50)


if __name__ == "__main__":
    setup_rag()
