
## 사전 준비
팀 공유 파일 필요:   
- `backend/saved_model/` — KlueBERT 파인튜닝 모델 파일   
- `backend/rag/data/training_depression_data.csv` — RAG DB 구축용 원본 데이터

## 파일 구조 (주요)
```
backend/   
├── main.py              # FastAPI 서버 진입점   
├── ai_module.py         # GPT 연동, GraphRAG 컨텍스트 생성   
├── saved_model/         # KlueBERT 모델 파일 (별도 수령)   
└── rag/  
    ├── model.py         # CustomBertForMTL 정의 및 모델 로딩   
    ├── rag.py           # 유사 발화 벡터 검색 (Chroma + 리랭킹)   
    ├── graph.py         # GraphRAG: 사용자 지식 그래프 구성 및 순회   
    ├── db/              # SQLite + Chroma 인덱스   
    └── scripts/   
        └── setup_rag.py # RAG DB 초기화 스크립트   
```

## RAG DB 구축 (최초 1회)
```
cd backend   
python -m rag.scripts.setup_rag
```

rag/db/depression_rag.db, rag/db/chroma_store/가 생성됨

## 터미널 1 — KlueBERT 모델 서버
```
cd backend   
python -m uvicorn kluebert_fastapi.app:app --port 8001
```

## 터미널 2 — 마음돌봄 백엔드
```
cd backend   
python -m uvicorn main:app --reload --port 8000
```

## 터미널 3 — React 프론트
```
cd mindcare-app   
npm run dev
```
