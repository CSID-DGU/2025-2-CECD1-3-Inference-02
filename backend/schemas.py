from pydantic import BaseModel, field_validator
from typing import Optional, Union, List
from datetime import date as DateType, datetime
import re


# ============================================================
# Auth
# ============================================================
class RegisterRequest(BaseModel):
    username: str
    password: str
    nickname: str
    age: Optional[int] = None
    gender: Optional[str] = None
    role: str = "user"  # "user" or "doctor"
    specialty: Optional[str] = None
    license_number: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        if not re.search(r"[a-zA-Z]", v) or not re.search(r"[0-9]", v):
            raise ValueError("비밀번호는 영문과 숫자를 포함해야 합니다.")
        return v


class RegisterResponse(BaseModel):
    user_id: int
    username: str
    nickname: str
    age: Optional[int] = None
    gender: Optional[str] = None
    role: str = "user"


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    user_id: int
    username: str
    nickname: str
    age: Optional[int] = None
    gender: Optional[str] = None
    role: str = "user"
    specialty: Optional[str] = None
    first_phq_done: bool
    access_token: str
    token_type: str = "bearer"


# ============================================================
# Doctor
# ============================================================
class AddPatientRequest(BaseModel):
    patient_username: str
    note: Optional[str] = None


# ============================================================
# Chat
# ============================================================
class ChatRequest(BaseModel):
    user_id: int
    message: str
    mode: str = "free"
    round: int = 0
    target_date: str = ""
    character: str = "default"  # default, dog, cat, tree


class ChatResponse(BaseModel):
    user_id: int
    cause: Optional[str] = None
    reply: str
    wrap_up: bool = False
    progress: int = 0


class ChatLogItem(BaseModel):
    id: int
    role: str
    message: str
    created_date: datetime

    class Config:
        from_attributes = True


# ============================================================
# Diary
# ============================================================
class DiaryCreateRequest(BaseModel):
    user_id: int
    mood: Optional[str] = None
    content: str
    created_date: Optional[DateType] = None


class DiaryResponse(BaseModel):
    id: int
    user_id: int
    created_date: DateType
    mood: Optional[str] = None
    content: str

    class Config:
        from_attributes = True


# ============================================================
# Sleep
# ============================================================
class SleepCreateRequest(BaseModel):
    user_id: int
    date: DateType | None = None
    bedtime: str
    wakeup: str
    hours: float
    quality: str | None = None
    issues: list | None = None


class SleepResponse(BaseModel):
    id: int
    user_id: int
    date: DateType
    bedtime: str
    wakeup: str
    hours: float
    quality: Optional[str] = None
    issues: Optional[list] = None

    class Config:
        from_attributes = True


# ============================================================
# Report
# ============================================================
class DailyReportItem(BaseModel):
    date: str
    mood: Optional[str] = None
    summary: str
    keywords: list[str] = []


class WeeklyReport(BaseModel):
    period: str
    mood_distribution: dict
    top_keywords: list[dict]
    insight: str
    recommendation: str


class DepressionReport(BaseModel):
    user_id: int
    overall_risk_level: str
    insight: str
    evidence_conversations: list[dict] = []