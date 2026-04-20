# 2025-2-CECD1-3-Inference-02
2025-2학기 종합설계 1 석문기 교수님 분반 인퍼런스 팀

마음돌봄 프로젝트 세팅 가이드
폴더 구조:
Mindcare/
├── mindcare-app/          ← React 프론트엔드
│   ├── src/App.jsx
│   └── package.json
├── backend/               ← FastAPI 백엔드
│   ├── main.py
│   ├── database.py
│   ├── schemas.py
│   ├── auth.py
│   ├── ai_module.py
│   ├── .env              ← 직접 생성 필요
│   └── kluebert_fastapi/  ← KlueBERT 모델 서버
│       ├── app.py
│       └── saved_model/   ← 모델 파일 별도 전달
└── .gitignore

===============================================

최초 세팅:
bash# 1. 클론
git clone [레포 URL]
cd Mindcare

# 2. 프론트 설치
cd mindcare-app
npm install

# 3. 백엔드 설치
cd ../backend
pip install fastapi uvicorn sqlalchemy python-jose[cryptography] pydantic openai python-dotenv bcrypt httpx

# 4. KlueBERT 설치
cd kluebert_fastapi
pip install torch transformers sentencepiece numpy

# 5. .env 파일 생성 (backend/ 폴더에)
# .env.example 참고해서 만들기

# 6. DB 초기화 (최초 1회 — 서버 시작하면 자동 생성됨)
# 이미 DB가 있는 경우 마이그레이션:
cd ../backend
python migrate.py

===============================================

# 터미널 1 — KlueBERT 모델 서버
cd backend/kluebert_fastapi
python -m uvicorn app:app --port 8001

# 터미널 2 — 마음돌봄 백엔드
cd backend
python -m uvicorn main:app --reload --port 8000

# 터미널 3 — React 프론트
cd mindcare-app
npm run dev
