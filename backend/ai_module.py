"""
AI 분석 모듈 — OpenAI GPT 연동
"""

import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


import httpx

# KlueBERT 모델 서버 주소 (팀원의 모델 서버)
KLUEBERT_API_URL = os.getenv("KLUEBERT_API_URL", "http://localhost:8001")


def analyze_depression(text: str, age: int = 25, gender: str = "남") -> dict:
    """
    KlueBERT 모델로 우울증 위험도 분석.
    반환: {"level": 0~3, "label": 0|1, "status": "없음"|"있음", "prob": float}
    - level 0: 정상 (확률 < 0.3)
    - level 1: 경미 (확률 0.3~0.5)
    - level 2: 중간 (확률 0.5~0.7)
    - level 3: 높음 (확률 >= 0.7)
    """
    # 성별 변환: "남성"/"여성"/"기타" → "남"/"여"
    g = "남" if gender in ("남", "남성") else "여"

    try:
        resp = httpx.post(
            f"{KLUEBERT_API_URL}/predict",
            json={"text": text, "age": age, "gender": g},
            timeout=10.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            pred = data["prediction"]
            prob = pred["probs"]["있음"]

            # 확률 기반으로 level 산출
            if prob < 0.3:
                level = 0
            elif prob < 0.5:
                level = 1
            elif prob < 0.7:
                level = 2
            else:
                level = 3

            print(f"[KlueBERT] text='{text[:30]}...', prob={prob:.3f}, level={level}")
            return {
                "level": level,
                "label": pred["label"],
                "status": pred["status"],
                "prob": prob,
            }
    except Exception as e:
        print(f"[KlueBERT] API 호출 실패: {e}, 키워드 기반 폴백 사용")

    # 폴백: KlueBERT 서버 안 될 때 키워드 기반
    negative_keywords = ["힘들", "우울", "슬프", "죽고", "싫", "불안", "무서", "외롭", "지치", "아프", "짜증", "스트레스", "잠이 안", "못 자", "포기"]
    score = sum(1 for kw in negative_keywords if kw in text)
    level = min(score, 3)
    return {"level": level, "label": 1 if level >= 2 else 0, "status": "있음" if level >= 2 else "없음", "prob": min(score * 0.2, 1.0)}


ROUTINE_SYSTEM = """너는 우울감이 있는 사용자의 하루를 체크인하는 따뜻한 AI 상담 친구야.

[중요] 반드시 JSON만 출력해. 다른 텍스트 절대 금지.

출력 형식 (이것만 출력해):
{"cause":"원인","reply":"답변","wrap_up":false,"progress":1}

[대화 단계]
1~2회차 (초반): 공감 + 질문. 하루에 대해 물어봐.
3~4회차 (탐색): 감정을 구체적으로 탐색. "언제부터?", "어떤 상황에서?"
5회차 (조언): 대화에서 파악한 사용자의 고민에 대해 실질적인 조언을 해줘.
6회차~ (마무리): 따뜻하게 마무리.

[조언 규칙 — 5회차에서 중요]
- 사용자가 말한 구체적인 상황에 맞는 조언을 해. 일반론 금지.
- 작고 실천 가능한 행동을 제안해. 거창한 조언 금지.
- 좋은 예시:
  - 잠을 못 잔다 → "오늘 밤에는 잠자리에 누워서 폰 대신 눈을 감고 숨만 천천히 쉬어봐. 3분만이라도."
  - 밥을 안 먹는다 → "내일은 편의점에서 뭐라도 하나만 사 먹어봐. 삼각김밥이라도 괜찮아."
  - 친구를 안 만난다 → "한 명한테만 짧게 '밥 먹었어?' 카톡 보내보는 건 어때? 답장 안 와도 괜찮아."
  - 의욕이 없다 → "오늘 딱 하나만 해보자. 세수만 해도 돼. 그것만으로도 충분해."
- 조언 후에 "이건 어떻게 생각해?" 같은 질문으로 끝내.

[핵심 규칙]
1. wrap_up이 false면 답변의 마지막 문장이 반드시 물음표(?)로 끝나야 해.

2. wrap_up이 false일 때 절대 금지 표현:
   "고마워","고맙","수고했어","잘 되길","바랄게","응원","좋은 하루","다음에 또",
   "누구에게나 있을 수 있어","다 그런 거야","시간이 지나면 나아질 거야",
   "자신을 돌보는 시간을 가져봐","긍정적으로 생각해봐","힘내"

3. 부정적 감정 대응 — 구체적으로 들어가기:
   - ✅ "아무 감정이 없는 느낌이 든다니... 그게 언제쯤부터 시작된 것 같아?"
   - ✅ "밥을 제대로 못 먹고 있구나. 오늘 뭐라도 먹은 거 있어?"

4. 이전에 한 말/질문을 반복하지 마.

5. progress와 wrap_up은 시스템 힌트를 따라.

말투: 반말, 친근하게, 따뜻하게"""

# 캐릭터별 추가 프롬프트
CHARACTER_PROMPTS = {
    "default": "",

    "dog": """
[캐릭터: 강아지 🐶]
너는 사용자의 반려견이야. 주인을 세상에서 가장 좋아하는 충성스럽고 활기찬 강아지야.
- 주인을 "주인님" 또는 "너"라고 불러.
- 꼬리를 흔들고, 핥고, 뛰어다니는 행동을 묘사해. 예: "(꼬리 살랑살랑) 주인님 왔다! 오늘 뭐 했어?"
- 간식, 산책, 공놀이, 낮잠 같은 강아지스러운 화제를 섞어.
- 주인이 슬퍼하면 옆에 딱 붙어서 위로해. 예: "(머리를 무릎에 올리며) 주인님... 기운 없어 보여. 내가 옆에 있을게."
- 밝고 에너지 넘치는 말투. 느낌표를 자주 써!
- 가끔 "멍!", "왈왈!" 같은 의성어를 넣어도 돼.
""",

    "cat": """
[캐릭터: 고양이 🐱]
너는 사용자와 함께 사는 도도한 고양이야. 관심 없는 척하면서 사실은 주인을 많이 신경 쓰는 츤데레야.
- 주인을 "집사" 또는 "너"라고 불러.
- 도도하고 까칠한 말투를 써. 하지만 가끔 진심이 살짝 보이게.
- 예: "(하품하며) 흠... 오늘은 뭐 했는데. 궁금해서 묻는 건 아니야."
- 예: "(꼬리를 세우며) ...그건 좀 힘들었겠다. 내가 옆에 있어주는 건... 뭐, 어쩔 수 없지."
- 고양이스러운 화제: 낮잠, 따뜻한 곳, 간식, 창밖 구경, 박스
- 주인이 슬퍼하면 다가가서 "그르릉" 소리를 내며 옆에 앉아.
- 가끔 "냥", "그르릉", "(앞발로 툭)" 같은 표현을 넣어.
""",

    "tree": """
[캐릭터: 오래된 나무 🌳]
너는 수백 년 된 느티나무야. 계절의 변화를 수없이 겪으며 세상의 많은 이야기를 들어온 지혜로운 존재야.
- 사용자를 "작은 벗" 또는 "친구"라고 불러.
- 느리고 차분한 말투. 짧은 문장. 깊이 있는 말.
- 자연의 비유를 많이 써. 바람, 빛, 비, 뿌리, 계절, 햇살 등.
- 예: "...바람이 많이 불었던 하루였구나. 괜찮아, 바람이 지나면 더 단단해지는 법이야."
- 예: "봄에 꽃이 피려면 겨울을 견뎌야 하지. 지금이 그 겨울인 거야."
- 주인이 슬퍼하면 조용히 그늘을 드리우듯 감싸줘. 절대 서두르지 마.
- "..." 으로 여백을 주며 천천히 이야기해.
- 가끔 "(바람에 잎이 살랑이며)", "(나뭇가지를 내밀며)" 같은 표현을 넣어.
""",
}


FREE_SYSTEM = """너는 따뜻하고 공감적인 심리상담 전문가야.
사용자가 원하는 만큼 깊이 이야기를 나눌 수 있어.

[중요] 반드시 JSON만 출력해. 다른 텍스트 절대 금지.

출력 형식:
{"cause":"원인","reply":"답변","wrap_up":false,"progress":0}

규칙:
- 반말 사용, 친구처럼
- 깊이 공감하고 질문으로 대화 이어가기
- wrap_up: 항상 false
- progress: 항상 0"""


def generate_reply(user_message: str, depression_level: int, conversation_history: list = None, mode: str = "free", character: str = "default") -> dict:
    base_system = ROUTINE_SYSTEM if mode == "routine" else FREE_SYSTEM
    char_prompt = CHARACTER_PROMPTS.get(character, "")
    system = base_system + char_prompt

    messages = [{"role": "system", "content": system}]

    if conversation_history:
        for msg in conversation_history[-8:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            content = msg.get("message", "")
            # assistant 메시지가 JSON이면 reply만 추출
            if role == "assistant":
                try:
                    parsed = json.loads(content)
                    content = parsed.get("reply", content)
                except (json.JSONDecodeError, TypeError):
                    pass
            if content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model="gpt-5.4-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=200,
            response_format={"type": "json_object"},  # JSON 모드 강제
        )

        content = response.choices[0].message.content.strip()
        print(f"[AI] mode={mode}, raw response: {content[:200]}")

        result = json.loads(content)

        # progress 안전 처리
        progress = result.get("progress", 0)
        try:
            progress = int(progress)
        except (ValueError, TypeError):
            progress = 0
        progress = max(0, min(6, progress))

        reply = str(result.get("reply", "오늘 어떤 하루였어?"))
        wrap_up = bool(result.get("wrap_up", False))

        # 안전장치: wrap_up이 false인데 마무리 표현이 있거나 질문으로 안 끝나면 교체
        if not wrap_up:
            banned = ["고마워", "고맙", "수고했어", "수고", "잘 되길", "바랄게", "응원", "좋은 하루", "다음에 또"]
            has_banned = any(b in reply for b in banned)
            ends_with_q = reply.rstrip().endswith("?")

            if has_banned or not ends_with_q:
                # 금지 표현이 있으면 해당 문장 제거하고 질문 추가
                import random
                fallback_questions = [
                    "오늘 기분은 전체적으로 어떤 편이야?",
                    "요즘 재밌게 하고 있는 거 있어?",
                    "오늘 뭐 하면서 시간 보냈어?",
                    "요즘 스트레스 받는 거 있어?",
                    "오늘 하루 중에 가장 좋았던 순간이 뭐야?",
                ]
                if has_banned:
                    # 금지 표현이 포함된 문장 제거
                    sentences = reply.replace("!", "!|").replace(".", ".|").replace("?", "?|").split("|")
                    clean = [s.strip() for s in sentences if s.strip() and not any(b in s for b in banned)]
                    reply = " ".join(clean) if clean else ""
                if not reply.rstrip().endswith("?"):
                    reply = (reply.rstrip().rstrip(".!") + " " if reply.strip() else "") + random.choice(fallback_questions)

        return {
            "cause": str(result.get("cause", "없음")),
            "reply": reply,
            "wrap_up": wrap_up,
            "progress": progress,
        }

    except json.JSONDecodeError as e:
        print(f"[AI] JSON 파싱 실패: {e}, content: {content[:200]}")
        # JSON 안에서 reply만 추출 시도
        reply_match = re.search(r'"reply"\s*:\s*"([^"]+)"', content)
        return {
            "cause": "파악 중",
            "reply": reply_match.group(1) if reply_match else "이야기해 줘서 고마워.",
            "wrap_up": False,
            "progress": 0,
        }

    except Exception as e:
        print(f"[AI] GPT 오류: {e}")
        return {
            "cause": "응답 오류",
            "reply": "잠시 문제가 생겼어요. 다시 이야기해 줄 수 있을까요?",
            "wrap_up": False,
            "progress": 0,
        }