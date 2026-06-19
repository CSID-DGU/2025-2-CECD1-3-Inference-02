# 2025-2-CECD1-3-Inference-02
2025-2학기 종합설계 1 석문기 교수님 분반 인퍼런스 팀


## 사전 준비
팀 공유 파일 필요(드라이브에 전달):   
- `backend/saved_model/` — KlueBERT 파인튜닝 모델 파일   
- `backend/rag/data/source_data/` — RAG DB 구축용 원본 데이터

## 파일 구조 (주요)
```
mindcare-app/                     # React 프론트엔드
├── src/App.jsx
└── package.json

backend/   
├── main.py                       # FastAPI 서버 진입점   
├── ai_module.py                  # GPT 연동, GraphRAG 컨텍스트 생성   
├── saved_model/                  # KlueBERT 모델 파일 (별도 수령)   
└── rag/
    ├── model.py                  # CustomBertForMTL 정의 및 모델 로딩   
    ├── rag.py                    # 유사 발화 벡터 검색 (Chroma + 리랭킹)   
    ├── graph.py                  # GraphRAG: 사용자 지식 그래프 구성 및 순회   
    ├── db/                       # SQLite + Chroma 인덱스
    ├── data/source_data/         # RAG DB 구축용 데이터 (별도 수령) 
    └── scripts/   
        └── setup_rag.py          # RAG DB 초기화 스크립트   
```

---
## 최초 세팅
### 1. 클론
```
git clone [레포 URL]
cd Mindcare
```

### 2. 프론트 설치
```
cd mindcare-app
npm install
```

### 3. 백엔드 설치
```
cd ../backend
pip install fastapi uvicorn sqlalchemy python-jose[cryptography] pydantic openai python-dotenv bcrypt httpx
```

### 4. KlueBERT 설치
```
cd kluebert_fastapi
pip install torch transformers sentencepiece numpy
```

### 5. .env 파일 생성 (backend/ 폴더에)
 .env.example 참고하여 작성 (OpenAI API key 필요)

### 6. DB 초기화 (최초 1회 — 서버 시작하면 자동 생성됨)
이미 DB가 있는 경우 마이그레이션:
```
cd ../backend
python migrate.py
```

### 7. RAG DB 초기화 및 구축
```
cd backend   
python -m rag.scripts.setup_rag
```

rag/db/depression_rag.db, rag/db/chroma_store/가 생성됨

---
## 실행
### 터미널 1 — KlueBERT 모델 서버
```
cd backend   
python -m uvicorn kluebert_fastapi.app:app --port 8001
```

### 터미널 2 — 마음돌봄 백엔드
```
cd backend   
python -m uvicorn main:app --reload --port 8000
```

### 터미널 3 — React 프론트
```
cd mindcare-app   
npm run dev
```

---
## 접속

- 앱: http://localhost:5173
- 백엔드 API 문서: http://localhost:8000/docs
- KlueBERT API 문서: http://localhost:8001/docs

### 테스트 계정 만들기

- 일반 사용자: 회원가입에서 "일반 사용자" 선택
- 의사: 회원가입에서 "의사" 선택 → 전문 분야, 면허번호 입력
- 의사 계정에서 환자 추가: 환자의 아이디 입력

### 주의사항

- KlueBERT 서버가 꺼져 있어도 앱은 동작함 (키워드 기반 폴백)
- saved_model, source_data은 별도 수령 필요
- .env 파일은 각자 생성 필요
