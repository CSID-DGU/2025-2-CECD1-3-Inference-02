from rag.scripts.init_db import init_db
from rag.scripts.load_csv import load_csv
from rag.scripts.embedding import build_chroma

def setup_rag():
    init_db()
    load_csv()
    build_chroma()
    print("RAG 초기화 완료")

if __name__ == "__main__":
    setup_rag()