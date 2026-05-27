"""
마음돌봄 백엔드 서버
FastAPI + SQLite + JWT 인증

실행: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import bcrypt
from datetime import date, datetime
from collections import Counter

from database import get_db, User, ChatLog, CriticalConversation, Diary, SleepLog, DoctorPatient
from schemas import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    ChatRequest, ChatResponse, ChatLogItem,
    DiaryCreateRequest, DiaryResponse,
    SleepCreateRequest, SleepResponse,
    AddPatientRequest,
)
from auth import create_access_token, get_current_user
from ai_module import analyze_depression, generate_reply
import re

# 키워드 불용어 필터
_STOP_WORDS = {
    "데일리", "체크인", "돌아보기", "하루", "일기", "감사일기", "내용", "작성", "기록", "오늘의", "오늘", "오늘은",
    "1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월",
    "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일",
    "에서", "으로", "하고", "해서", "인데", "이랑", "하는", "되는", "것을", "수가",
    "대한", "대해", "위해", "통해", "때문", "같은", "같아", "것은", "것이", "거야",
    "이런", "저런", "그런", "어떤", "하면", "되면", "보면",
    "기분", "기분:", "기분은", "있었", "했어", "그냥", "좀", "너무", "정말", "진짜",
    "했다", "있다", "없다", "있어", "없어", "했어요", "있었어요", "없었어요",
    "더", "또", "이", "그", "저", "제", "나", "내", "뭐", "좋은", "많이", "조금",
    "아주", "매우", "되게", "엄청", "완전", "약간", "별로", "거의",
}

def is_valid_keyword(w):
    if w in _STOP_WORDS: return False
    if len(w) < 2: return False
    if re.match(r'^\d', w): return False
    if re.search(r'\d+일', w): return False
    if re.search(r'\d+월', w): return False
    return True

app = FastAPI(title="마음돌봄 API", version="1.0.0")

# CORS — React 개발 서버 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 1. 회원가입 — POST /register
# ============================================================
@app.post("/register", response_model=RegisterResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")

    hashed_pw = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    new_user = User(
        username=data.username,
        password_hash=hashed_pw,
        nickname=data.nickname,
        age=data.age,
        gender=data.gender,
        role=data.role if data.role in ("user", "doctor") else "user",
        specialty=data.specialty,
        license_number=data.license_number,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return RegisterResponse(
        user_id=new_user.id,
        username=new_user.username,
        nickname=new_user.nickname,
        age=new_user.age,
        gender=new_user.gender,
        role=new_user.role,
    )


# ============================================================
# 2. 로그인 — POST /login
# ============================================================
@app.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="존재하지 않는 아이디입니다.")

    if not bcrypt.checkpw(data.password.encode("utf-8"), user.password_hash.encode("utf-8")):
        raise HTTPException(status_code=400, detail="비밀번호가 올바르지 않습니다.")

    payload = {"sub": str(user.id), "is_admin": (user.username == "admin")}
    access_token = create_access_token(payload)

    return LoginResponse(
        user_id=user.id,
        username=user.username,
        nickname=user.nickname,
        age=user.age,
        gender=user.gender,
        role=user.role or "user",
        specialty=user.specialty,
        first_phq_done=user.first_phq_done or False,
        access_token=access_token,
    )


# ============================================================
# 3. 채팅 — POST /chat
# ============================================================
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    # 사용자 존재 확인
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # 최근 대화 히스토리 (GPT 맥락용, 최근 10개)
    recent_logs = (
        db.query(ChatLog)
        .filter(ChatLog.user_id == req.user_id)
        .order_by(ChatLog.id.desc())
        .limit(10)
        .all()
    )
    conversation_history = [
        {"role": log.role, "message": log.message}
        for log in reversed(recent_logs)
    ]

    # routine 모드: 프론트에서 보내준 round를 기준으로 progress 계산
    current_round = req.round if req.round > 0 else 1
    target_date_str = req.target_date if req.target_date else str(date.today())
    progress_hint = ""
    if req.mode == "routine":
        print(f"[CHAT] routine mode, round={current_round}, target_date={target_date_str}")
        date_context = f" 상담 날짜는 {target_date_str}이야."
        if current_round <= 2:
            progress_hint = f"\n[시스템: 사용자 {current_round}번째 답변.{date_context} 아직 초반이야. 절대 마무리하지 마. 공감하고 하루에 대해 물어봐. 질문으로 끝내.]"
        elif current_round <= 4:
            progress_hint = f"\n[시스템: 사용자 {current_round}번째 답변.{date_context} 감정을 구체적으로 탐색해. 아직 마무리하지 마. 질문으로 끝내.]"
        elif current_round == 5:
            progress_hint = f"\n[시스템: 사용자 {current_round}번째 답변. 지금까지 대화에서 파악한 사용자의 고민에 대해 작고 실천 가능한 조언을 해줘. 조언 후 '이건 어떻게 생각해?' 같은 질문으로 끝내. wrap_up은 아직 false.]"
        else:
            progress_hint = f"\n[시스템: 사용자 {current_round}번째 답변. 충분히 대화했어. 따뜻하게 마무리해도 좋아. wrap_up: true로 해.]"

    # AI 분석 (KlueBERT 모델 호출)
    user_age = user.age or 25
    user_gender = user.gender or "남"
    depression_result = analyze_depression(req.message, age=user_age, gender=user_gender)
    depression_level = depression_result["level"]

    ai_result = generate_reply(req.message, depression_level, conversation_history, mode=req.mode, character=req.character, user_id=req.user_id, age=user_age, gender=user_gender, progress_hint=progress_hint)

    # 서버에서 progress 강제 덮어쓰기
    if req.mode == "routine":
        server_progress = min(current_round, 6)
        ai_result["progress"] = server_progress
        if current_round < 5:
            ai_result["wrap_up"] = False

    # target_date 결정
    td = req.target_date if req.target_date else str(date.today())
    kluebert_prob_val = depression_result.get("prob", None)

    user_log = ChatLog(
        user_id=req.user_id,
        role="user",
        message=req.message,
        depression_level=depression_level,
        target_date=td,
        kluebert_prob=kluebert_prob_val,
    )
    db.add(user_log)

    assistant_log = ChatLog(
        user_id=req.user_id,
        role="assistant",
        message=ai_result["reply"],
        depression_level=depression_level,
        cause=ai_result["cause"],
        target_date=td,
    )
    db.add(assistant_log)

    # 위험 대화 저장 (depression_level >= 2)
    if depression_level >= 2:
        critical = CriticalConversation(
            user_id=req.user_id,
            user_message=req.message,
            assistant_reply=ai_result["reply"],
            depression_level=depression_level,
            cause=ai_result["cause"],
        )
        db.add(critical)

    db.commit()

    return ChatResponse(
        user_id=req.user_id,
        cause=ai_result["cause"],
        reply=ai_result["reply"],
        wrap_up=ai_result.get("wrap_up", False),
        progress=ai_result.get("progress", 0),
    )


# ============================================================
# 4. 채팅 로그 조회 — GET /chat/logs
# ============================================================
@app.get("/chat/logs")
def get_chat_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    logs = (
        db.query(ChatLog)
        .filter(ChatLog.user_id == current_user.id)
        .order_by(ChatLog.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": log.id,
            "role": log.role,
            "message": log.message,
            "target_date": log.target_date or "",
            "created_date": log.created_date,
        }
        for log in logs
    ]


# ============================================================
# 5. 일기 생성/수정 — POST /diary
# ============================================================
@app.post("/diary", response_model=DiaryResponse)
def create_or_update_diary(req: DiaryCreateRequest, db: Session = Depends(get_db)):
    diary_date = req.created_date or date.today()

    # 동일 날짜 일기 존재 여부
    diary = (
        db.query(Diary)
        .filter(Diary.user_id == req.user_id, Diary.created_date == diary_date)
        .first()
    )

    if diary:
        diary.mood = req.mood
        diary.content = req.content
    else:
        diary = Diary(
            user_id=req.user_id,
            created_date=diary_date,
            mood=req.mood,
            content=req.content,
        )
        db.add(diary)

    db.commit()
    db.refresh(diary)
    return diary


# ============================================================
# 6. 일기 목록 조회 — GET /diary/list
# ============================================================
@app.get("/diary/list", response_model=list[DiaryResponse])
def get_diary_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    diaries = (
        db.query(Diary)
        .filter(Diary.user_id == current_user.id)
        .order_by(Diary.created_date.desc())
        .all()
    )
    return diaries


# ============================================================
# 7. 수면 기록 저장 — POST /sleep
# ============================================================
@app.post("/sleep", response_model=SleepResponse)
def create_sleep_log(req: SleepCreateRequest, db: Session = Depends(get_db)):
    sleep_date = req.date or date.today()

    # 동일 날짜 기록 존재 시 업데이트
    existing = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == req.user_id, SleepLog.date == sleep_date)
        .first()
    )

    if existing:
        existing.bedtime = req.bedtime
        existing.wakeup = req.wakeup
        existing.hours = req.hours
        existing.quality = req.quality
        existing.issues = req.issues
        db.commit()
        db.refresh(existing)
        return existing

    sleep_log = SleepLog(
        user_id=req.user_id,
        date=sleep_date,
        bedtime=req.bedtime,
        wakeup=req.wakeup,
        hours=req.hours,
        quality=req.quality,
        issues=req.issues,
    )
    db.add(sleep_log)
    db.commit()
    db.refresh(sleep_log)
    return sleep_log


# ============================================================
# 8. 수면 기록 조회 — GET /sleep/logs
# ============================================================
@app.get("/sleep/logs")
def get_sleep_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == current_user.id)
        .order_by(SleepLog.date.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": log.id,
            "date": str(log.date),
            "bedtime": log.bedtime,
            "wakeup": log.wakeup,
            "hours": log.hours,
            "quality": log.quality,
            "issues": log.issues or [],
        }
        for log in logs
    ]


# ============================================================
# 9. 일별 리포트 — GET /report/daily
# ============================================================
@app.get("/report/daily")
def get_daily_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 최근 일기 기반으로 일별 요약 생성
    diaries = (
        db.query(Diary)
        .filter(Diary.user_id == current_user.id)
        .order_by(Diary.created_date.desc())
        .limit(14)
        .all()
    )

    result = []
    for d in diaries:
        words = d.content.replace(".", "").replace(",", "").replace("!", "").replace("?", "").replace("[", "").replace("]", "").split()
        keywords = [w for w in words if is_valid_keyword(w)][:3]

        result.append({
            "date": str(d.created_date),
            "mood": d.mood,
            "summary": d.content[:100],
            "keywords": keywords,
        })

    return result


# ============================================================
# 10. 주간 리포트 — GET /report/weekly
# ============================================================
@app.get("/report/weekly")
def get_weekly_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 최근 7일 일기
    diaries = (
        db.query(Diary)
        .filter(Diary.user_id == current_user.id)
        .order_by(Diary.created_date.desc())
        .limit(7)
        .all()
    )

    if not diaries:
        return {"period": "", "mood_distribution": {}, "top_keywords": [], "insight": "데이터가 부족합니다.", "recommendation": "데일리 체크인을 시작해보세요."}

    # 기분 분포
    mood_counter = Counter(d.mood for d in diaries if d.mood)

    # 키워드 추출
    all_words = []
    for d in diaries:
        words = d.content.replace(".", "").replace(",", "").replace("!", "").replace("?", "").replace("[", "").replace("]", "").split()
        all_words.extend([w for w in words if is_valid_keyword(w)])
    word_counter = Counter(all_words).most_common(5)

    dates = [str(d.created_date) for d in diaries]
    period = f"{dates[-1]} ~ {dates[0]}" if len(dates) >= 2 else dates[0]

    # GPT로 인사이트 + 추천 생성
    mood_summary = ", ".join([f"{e} {c}일" for e, c in mood_counter.most_common()])
    keyword_summary = ", ".join([w for w, c in word_counter])
    insight_text = "주간 분석 데이터가 부족합니다."
    recommendation_text = "매일 하루 돌아보기를 통해 더 정확한 분석을 받아보세요."

    if mood_summary:
        try:
            from ai_module import client
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "너는 심리 상담 리포트를 작성하는 AI야. 사용자의 주간 기분과 키워드를 보고 2~3문장으로 인사이트를 작성해. 반말, 따뜻하게. 진단하지 마."},
                    {"role": "user", "content": f"이번 주 기분 분포: {mood_summary}\n주요 키워드: {keyword_summary}\n\n이 데이터를 바탕으로 1) 인사이트 (이번 주 감정 흐름 요약) 2) 추천 (다음 주에 시도해볼 만한 것)을 각각 2문장으로 써줘. JSON으로: {{\"insight\":\"...\",\"recommendation\":\"...\"}}"},
                ],
                response_format={"type": "json_object"},
                temperature=0.5,
                max_tokens=200,
            )
            import json
            result = json.loads(resp.choices[0].message.content)
            insight_text = result.get("insight", insight_text)
            recommendation_text = result.get("recommendation", recommendation_text)
        except Exception as e:
            print(f"[AI] 주간 인사이트 생성 실패: {e}")

    return {
        "period": period,
        "mood_distribution": dict(mood_counter),
        "top_keywords": [{"word": w, "count": c} for w, c in word_counter],
        "insight": insight_text,
        "recommendation": recommendation_text,
    }


# ============================================================
# 11. 우울 분석 리포트 — GET /report/depression
# ============================================================
@app.get("/report/depression")
def get_depression_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import timedelta

    # 최근 30일 사용자 대화 조회
    thirty_days_ago = datetime.now() - timedelta(days=30)
    logs = (
        db.query(ChatLog)
        .filter(
            ChatLog.user_id == current_user.id,
            ChatLog.role == "user",
            ChatLog.created_date >= thirty_days_ago,
        )
        .order_by(ChatLog.created_date.desc())
        .all()
    )

    if not logs:
        return {
            "user_id": current_user.id,
            "overall_risk_level": "분석 대기",
            "insight": "아직 분석할 대화 기록이 없어요. 상담을 시작해보세요.",
            "evidence_conversations": [],
            "kluebert_analysis": None,
        }

    # DB 캐시에서 kluebert_prob 읽기 (의사 대시보드와 동일 방식)
    user_age = current_user.age or 25
    user_gender = current_user.gender or "남"
    needs_commit = False

    for log in logs:
        if log.kluebert_prob is None:
            try:
                r = analyze_depression(log.message, age=user_age, gender=user_gender)
                log.kluebert_prob = r.get("prob", 0)
                log.depression_level = r.get("level", 0)
                needs_commit = True
            except:
                log.kluebert_prob = 0
                needs_commit = True

    if needs_commit:
        db.commit()

    # 종합 우울 확률 = 개별 확률의 평균 (의사 대시보드와 동일)
    kluebert_avg = sum(l.kluebert_prob for l in logs) / len(logs) if logs else 0
    neg_count = sum(1 for l in logs if l.kluebert_prob >= 0.5)
    kluebert_prob_pct = round(kluebert_avg * 100, 1)
    kluebert_neg_ratio = round((neg_count / len(logs)) * 100, 1) if logs else 0

    # 위험 단계 (의사 대시보드와 동일)
    if kluebert_avg >= 0.7:
        kluebert_level = 3
    elif kluebert_avg >= 0.5:
        kluebert_level = 2
    elif kluebert_avg >= 0.3:
        kluebert_level = 1
    else:
        kluebert_level = 0

    # 위험 대화 조회
    critical = (
        db.query(CriticalConversation)
        .filter(CriticalConversation.user_id == current_user.id)
        .order_by(CriticalConversation.created_date.desc())
        .limit(5)
        .all()
    )

    # 부정 기분 선택률
    recent_diaries = db.query(Diary).filter(Diary.user_id == current_user.id).order_by(Diary.created_date.desc()).limit(30).all()
    mood_dist = Counter(d.mood for d in recent_diaries if d.mood)
    neg_moods = sum(v for k, v in mood_dist.items() if k in ("😢", "😞", "😤", "😰", "😫"))
    total_moods = sum(mood_dist.values()) or 1
    mood_neg_ratio = neg_moods / total_moods

    # 종합 판단 — 의사 대시보드와 완전 동일 기준
    if kluebert_avg >= 0.7 or mood_neg_ratio >= 0.6:
        level = "주의"
        insight = f"최근 30일 대화의 평균 우울 확률이 {kluebert_prob_pct}%로 높게 나타났어요. 전문가와 상담을 고려해보세요."
    elif kluebert_avg >= 0.4 or mood_neg_ratio >= 0.3:
        level = "관심"
        insight = f"최근 30일 대화의 평균 우울 확률이 {kluebert_prob_pct}%입니다. 꾸준히 마음 상태를 확인해보세요."
    else:
        level = "양호"
        insight = f"최근 30일 대화의 평균 우울 확률이 {kluebert_prob_pct}%로 낮아요. 좋은 상태를 유지하고 있네요!"

    evidence = [
        {"message": c.user_message, "created_date": c.created_date.isoformat() if c.created_date else ""}
        for c in critical
    ]

    return {
        "user_id": current_user.id,
        "overall_risk_level": level,
        "insight": insight,
        "evidence_conversations": evidence,
        "kluebert_analysis": {
            "probability": kluebert_prob_pct,
            "negative_ratio": kluebert_neg_ratio,
            "status": "있음" if kluebert_avg >= 0.5 else "없음",
            "level": kluebert_level,
            "analyzed_count": len(logs),
        },
    }


# ============================================================
# 12. 대화 요약 생성 — POST /chat/summarize
# ============================================================
class SummarizeRequest(BaseModel):
    user_id: int
    messages: list = []  # 프론트에서 현재 세션의 대화를 직접 보내줌

@app.post("/chat/summarize")
def summarize_chat(req: SummarizeRequest):
    """프론트에서 보낸 대화 내용을 GPT에게 요약 요청"""
    from ai_module import client

    if not req.messages:
        return {"summary": ""}

    # 사용자/assistant 대화만 추출 (시스템 메시지 제외)
    conversation_text = ""
    for msg in req.messages:
        role = msg.get("role", "")
        message = msg.get("message", "")
        if role == "user":
            conversation_text += f"사용자: {message}\n"
        elif role == "assistant":
            conversation_text += f"상담사: {message}\n"

    if not conversation_text.strip():
        return {"summary": ""}

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "너는 상담 대화를 요약하는 AI야. 주어진 대화 내용만을 기반으로 사용자의 하루를 2~3문장으로 따뜻하게 요약해줘. 대화에 없는 내용은 추측하지 마. 반말 사용."},
                {"role": "user", "content": f"아래 대화를 2~3문장으로 요약해줘. 대화에 언급된 내용만 요약해:\n\n{conversation_text}"},
            ],
            temperature=0.3,
            max_tokens=150,
        )
        summary = response.choices[0].message.content.strip()
        print(f"[AI] 요약 생성: {summary[:100]}")
        return {"summary": summary}
    except Exception as e:
        print(f"[AI] 요약 오류: {e}")
        return {"summary": "요약을 생성하지 못했어요."}


# ============================================================
# Doctor APIs — 의사 전용
# ============================================================
def require_doctor(current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="의사 계정만 접근할 수 있습니다.")
    return current_user


@app.get("/doctor/patients")
def get_patients(current_user: User = Depends(require_doctor), db: Session = Depends(get_db)):
    """담당 환자 리스트"""
    links = db.query(DoctorPatient).filter(DoctorPatient.doctor_id == current_user.id).all()
    result = []
    for link in links:
        p = db.query(User).filter(User.id == link.patient_id).first()
        if not p:
            continue
        last_diary = db.query(Diary).filter(Diary.user_id == p.id).order_by(Diary.created_date.desc()).first()
        last_mood = last_diary.mood if last_diary else None
        last_diary_date = str(last_diary.created_date) if last_diary else None
        recent_diaries = db.query(Diary).filter(Diary.user_id == p.id).order_by(Diary.created_date.desc()).limit(7).all()
        mood_counts = Counter(d.mood for d in recent_diaries if d.mood)
        critical_count = db.query(CriticalConversation).filter(CriticalConversation.user_id == p.id).count()

        # 종합 위험도 — 백엔드에서 통일 계산
        # 1) 부정 기분 선택률
        neg_moods = sum(v for k, v in mood_counts.items() if k in ("😢", "😞", "😤", "😰", "😫"))
        total_moods = sum(mood_counts.values()) or 1
        mood_neg_ratio = neg_moods / total_moods

        # 2) KlueBERT 확률 (DB 캐시에서 읽기)
        from datetime import timedelta
        thirty_days_ago = datetime.now() - timedelta(days=30)
        user_logs = db.query(ChatLog).filter(
            ChatLog.user_id == p.id, ChatLog.role == "user",
            ChatLog.created_date >= thirty_days_ago,
            ChatLog.kluebert_prob != None,
        ).all()
        kluebert_avg = 0
        if user_logs:
            kluebert_avg = sum(l.kluebert_prob for l in user_logs) / len(user_logs)

        # 종합 판단 (종합 우울 확률 + 부정 기분 선택률)
        if kluebert_avg >= 0.7 or mood_neg_ratio >= 0.6:
            risk_level = "주의"
            risk_color = "high"
        elif kluebert_avg >= 0.4 or mood_neg_ratio >= 0.3:
            risk_level = "관심"
            risk_color = "mid"
        else:
            risk_level = "양호"
            risk_color = "low"

        result.append({
            "patient_id": p.id,
            "username": p.username,
            "nickname": p.nickname,
            "age": p.age,
            "gender": p.gender,
            "note": link.note,
            "last_mood": last_mood,
            "last_activity": last_diary_date,
            "mood_distribution_7d": dict(mood_counts),
            "critical_count": critical_count,
            "risk_level": risk_level,
            "risk_color": risk_color,
        })
    return result


@app.post("/doctor/patients")
def add_patient(req: AddPatientRequest, current_user: User = Depends(require_doctor), db: Session = Depends(get_db)):
    """환자 추가 (username으로)"""
    patient = db.query(User).filter(User.username == req.patient_username).first()
    if not patient:
        raise HTTPException(status_code=404, detail="해당 아이디의 사용자가 없습니다.")
    if patient.role != "user":
        raise HTTPException(status_code=400, detail="환자가 아닌 계정입니다.")

    existing = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id == current_user.id,
        DoctorPatient.patient_id == patient.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 담당 환자 목록에 있습니다.")

    link = DoctorPatient(doctor_id=current_user.id, patient_id=patient.id, note=req.note)
    db.add(link)
    db.commit()
    return {"ok": True, "patient_id": patient.id, "patient_nickname": patient.nickname}


@app.delete("/doctor/patients/{patient_id}")
def remove_patient(patient_id: int, current_user: User = Depends(require_doctor), db: Session = Depends(get_db)):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id == current_user.id,
        DoctorPatient.patient_id == patient_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="담당 환자가 아닙니다.")
    db.delete(link)
    db.commit()
    return {"ok": True}


def _check_patient_access(doctor_id, patient_id, db):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id == doctor_id,
        DoctorPatient.patient_id == patient_id,
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="담당 환자가 아닙니다.")


@app.get("/doctor/patients/{patient_id}/overview")
def patient_overview(patient_id: int, current_user: User = Depends(require_doctor), db: Session = Depends(get_db)):
    """환자 종합 정보"""
    _check_patient_access(current_user.id, patient_id, db)

    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다.")

    # 전체 일기 (최근 30일)
    diaries = db.query(Diary).filter(Diary.user_id == patient_id).order_by(Diary.created_date.desc()).limit(30).all()
    # 전체 수면 (최근 30일)
    sleeps = db.query(SleepLog).filter(SleepLog.user_id == patient_id).order_by(SleepLog.date.desc()).limit(30).all()
    # 위험 대화
    criticals = db.query(CriticalConversation).filter(CriticalConversation.user_id == patient_id).order_by(CriticalConversation.created_date.desc()).limit(20).all()

    # 기분 분포
    mood_dist = Counter(d.mood for d in diaries if d.mood)

    # 키워드 추출
    all_words = []
    for d in diaries:
        words = d.content.replace(".", "").replace(",", "").replace("!", "").replace("?", "").replace("[", "").replace("]", "").split()
        all_words.extend([w for w in words if is_valid_keyword(w)])
    top_keywords = Counter(all_words).most_common(10)

    # 수면 분석
    avg_sleep = sum(s.hours for s in sleeps) / len(sleeps) if sleeps else 0
    good_sleep = sum(1 for s in sleeps if s.quality == "good")
    poor_sleep = sum(1 for s in sleeps if s.quality == "poor")

    # 위험도 평가
    neg_moods = sum(v for k, v in mood_dist.items() if k in ("😢", "😞", "😤", "😰", "😫"))
    total_moods = sum(mood_dist.values()) or 1
    neg_ratio = neg_moods / total_moods
    critical_count = len(criticals)

    # KlueBERT 분석 — 최근 30일 대화 기반, DB 캐시 사용
    from datetime import timedelta
    thirty_days_ago = datetime.now() - timedelta(days=30)
    user_logs = db.query(ChatLog).filter(
        ChatLog.user_id == patient_id,
        ChatLog.role == "user",
        ChatLog.created_date >= thirty_days_ago,
    ).order_by(ChatLog.id.desc()).all()
    kluebert_neg_ratio = 0
    kluebert_prob_overall = 0
    kluebert_total = len(user_logs)
    kluebert_analyzed = sum(1 for l in user_logs if l.kluebert_prob is not None)
    kluebert_pending = kluebert_total - kluebert_analyzed

    if user_logs:
        neg_count = 0
        prob_sum = 0
        counted = 0
        for log in user_logs:
            prob = log.kluebert_prob
            if prob is not None:
                if prob >= 0.5:
                    neg_count += 1
                prob_sum += prob
                counted += 1

        kluebert_neg_ratio = round((neg_count / counted) * 100, 1) if counted else 0
        kluebert_prob_overall = round((prob_sum / counted) * 100, 1) if counted else 0

    if kluebert_prob_overall >= 70 or neg_ratio >= 0.6:
        risk_level = "높음"
        risk_color = "high"
    elif kluebert_prob_overall >= 40 or neg_ratio >= 0.3:
        risk_level = "중간"
        risk_color = "mid"
    else:
        risk_level = "낮음"
        risk_color = "low"

    return {
        "patient": {
            "id": patient.id,
            "username": patient.username,
            "nickname": patient.nickname,
            "age": patient.age,
            "gender": patient.gender,
        },
        "summary": {
            "total_diary_count": len(diaries),
            "total_sleep_count": len(sleeps),
            "avg_sleep_hours": round(avg_sleep, 1),
            "good_sleep_days": good_sleep,
            "poor_sleep_days": poor_sleep,
            "mood_distribution": dict(mood_dist),
            "top_keywords": [{"word": w, "count": c} for w, c in top_keywords],
            "risk_level": risk_level,
            "risk_color": risk_color,
            "negative_mood_ratio": round(neg_ratio * 100, 1),
            "critical_count": critical_count,
        },
        "kluebert_analysis": {
            "probability": kluebert_prob_overall,
            "negative_ratio": kluebert_neg_ratio,
            "status": "있음" if kluebert_prob_overall >= 50 else "없음",
            "level": 3 if kluebert_prob_overall >= 70 else (2 if kluebert_prob_overall >= 50 else (1 if kluebert_prob_overall >= 30 else 0)),
            "analyzed_count": kluebert_analyzed,
            "total_count": kluebert_total,
            "pending_count": kluebert_pending,
        } if kluebert_total > 0 else None,
        "recent_diaries": [
            {"date": str(d.created_date), "mood": d.mood, "content": d.content}
            for d in diaries[:14]
        ],
        "recent_sleeps": [
            {"date": str(s.date), "hours": s.hours, "quality": s.quality, "bedtime": s.bedtime, "wakeup": s.wakeup, "issues": s.issues}
            for s in sleeps[:14]
        ],
        "critical_conversations": [
            {"date": str(c.created_date), "user_message": c.user_message, "assistant_reply": c.assistant_reply, "cause": c.cause, "level": c.depression_level}
            for c in criticals[:10]
        ],
    }


@app.get("/doctor/patients/{patient_id}/chats")
def patient_chats(patient_id: int, current_user: User = Depends(require_doctor), db: Session = Depends(get_db), limit: int = 100):
    """환자 대화 기록"""
    _check_patient_access(current_user.id, patient_id, db)
    logs = db.query(ChatLog).filter(ChatLog.user_id == patient_id).order_by(ChatLog.id.desc()).limit(limit).all()
    return [
        {"id": l.id, "role": l.role, "message": l.message, "target_date": l.target_date or "", "created_date": str(l.created_date)}
        for l in logs
    ]


@app.post("/doctor/patients/{patient_id}/analyze-next")
def analyze_next(patient_id: int, current_user: User = Depends(require_doctor), db: Session = Depends(get_db)):
    """미분석 대화 1건을 KlueBERT로 분석 후 DB 저장. 프론트에서 반복 호출."""
    _check_patient_access(current_user.id, patient_id, db)

    patient = db.query(User).filter(User.id == patient_id).first()
    # 미분석 대화 1건
    log = db.query(ChatLog).filter(
        ChatLog.user_id == patient_id,
        ChatLog.role == "user",
        ChatLog.kluebert_prob == None,
    ).order_by(ChatLog.id.asc()).first()

    if not log:
        return {"done": True, "remaining": 0}

    # 남은 개수
    remaining = db.query(ChatLog).filter(
        ChatLog.user_id == patient_id,
        ChatLog.role == "user",
        ChatLog.kluebert_prob == None,
    ).count()

    p_age = patient.age if patient else 25
    p_gender = patient.gender if patient else "남"
    try:
        r = analyze_depression(log.message, age=p_age, gender=p_gender)
        log.kluebert_prob = r.get("prob", 0)
        log.depression_level = r.get("level", 0)
        db.commit()
    except Exception as e:
        log.kluebert_prob = 0
        db.commit()

    return {"done": False, "remaining": remaining - 1, "analyzed_text": log.message[:30], "prob": log.kluebert_prob}


# ============================================================
# 헬스체크
# ============================================================
@app.get("/")
def health_check():
    return {"status": "ok", "service": "마음돌봄 API"}