# 2025-2-CECD1-3-Inference-02
2025-2학기 종합설계 1 석문기 교수님 분반 인퍼런스 팀

마음돌봄 프로젝트 세팅 가이드
폴더 구조:
# Mindcare/
# ├── mindcare-app/          ← React 프론트엔드
# │   ├── src/App.jsx
# │   └── package.json
# ├── backend/               ← FastAPI 백엔드
# │   ├── main.py
# │   ├── database.py
# │   ├── schemas.py
# │   ├── auth.py
# │   ├── ai_module.py
# │   ├── .env              ← 직접 생성 필요
# │   └── kluebert_fastapi/  ← KlueBERT 모델 서버
# │       ├── app.py
# │       └── saved_model/   ← 모델 파일 별도 전달
# └── .gitignore

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


접속:

앱: http://localhost:5173
백엔드 API 문서: http://localhost:8000/docs
KlueBERT API 문서: http://localhost:8001/docs

테스트 계정 만들기:

일반 사용자: 회원가입에서 "일반 사용자" 선택
의사: 회원가입에서 "의사" 선택 → 전문 분야, 면허번호 입력
의사 계정에서 환자 추가: 환자의 아이디 입력

주의사항:

KlueBERT 서버가 꺼져 있어도 앱은 동작함 (키워드 기반 폴백)
pytorch_model.bin은 용량이 커서 Git에 안 올림 → 별도 전달 (구글 드라이브 등)
.env 파일은 각자 생성해야 함
