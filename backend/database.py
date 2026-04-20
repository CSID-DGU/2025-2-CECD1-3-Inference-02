from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, Float, Date, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

DATABASE_URL = "sqlite:///./mindcare.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# User 테이블
# ============================================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(32), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(32), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=True)
    role = Column(String(20), default="user")  # "user" or "doctor"
    specialty = Column(String(50), nullable=True)  # 의사 전문 분야
    license_number = Column(String(50), nullable=True)  # 의사 면허 번호
    first_phq_done = Column(Boolean, default=False)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ============================================================
# DoctorPatient 테이블 — 의사와 환자 연결
# ============================================================
class DoctorPatient(Base):
    __tablename__ = "doctor_patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(Integer, nullable=False, index=True)
    patient_id = Column(Integer, nullable=False, index=True)
    note = Column(Text, nullable=True)  # 의사가 환자에 대해 남기는 메모
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ============================================================
# ChatLog 테이블
# ============================================================
class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    message = Column(Text, nullable=False)
    depression_level = Column(Integer, nullable=True)
    cause = Column(Text, nullable=True)
    target_date = Column(String(10), nullable=True)  # 어떤 날짜의 회고인지 (YYYY-MM-DD)
    kluebert_prob = Column(Float, nullable=True)  # KlueBERT 우울 확률 (0.0~1.0)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ============================================================
# CriticalConversation 테이블 — 위험 대화 저장
# ============================================================
class CriticalConversation(Base):
    __tablename__ = "critical_conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    user_message = Column(Text, nullable=False)
    assistant_reply = Column(Text, nullable=False)
    depression_level = Column(Integer, nullable=False)
    cause = Column(Text, nullable=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ============================================================
# Diary 테이블
# ============================================================
class Diary(Base):
    __tablename__ = "diaries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    created_date = Column(Date, nullable=False)
    mood = Column(String(10), nullable=True)
    content = Column(Text, nullable=False)


# ============================================================
# SleepLog 테이블 (신규)
# ============================================================
class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    date = Column(Date, nullable=False)
    bedtime = Column(String(5), nullable=False)   # "23:30"
    wakeup = Column(String(5), nullable=False)     # "07:00"
    hours = Column(Float, nullable=False)
    quality = Column(String(10), nullable=True)     # "good", "fair", "poor"
    issues = Column(JSON, nullable=True)            # ["악몽", "자다가 깼음"]
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# 테이블 생성
Base.metadata.create_all(bind=engine)