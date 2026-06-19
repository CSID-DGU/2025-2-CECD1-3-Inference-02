import json
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timedelta

import networkx as nx


MINDCARE_DB = "mindcare.db"

CAUSE_TO_SYMPTOM = {
    "수면 문제": "sleep_problem",
    "수면 부족": "sleep_problem",
    "수면 과다": "sleep_problem",
    "불면": "sleep_problem",
    "무기력": "lethargy",
    "기운 없음": "lethargy",
    "외출이 힘든": "lethargy",
    "외부 활동의 어려움": "lethargy",
    "low_energy": "lethargy",
    "우울": "depressed_mood",
    "우울감": "depressed_mood",
    "우울한 기분": "depressed_mood",
    "기분이 별로": "depressed_mood",
    "외로움": "loneliness",
    "고립": "loneliness",
    "관계 단절": "relationship_stress",
    "관계 악화": "relationship_stress",
    "불안": "anxiety",
    "걱정": "anxiety",
    "두려움": "anxiety",
    "불확실성": "anxiety",
    "피로": "fatigue",
    "피곤": "fatigue",
    "스트레스": "stress",
    "취업 스트레스": "career_stress",
    "업무 스트레스": "work_stress",
    "화나는 일": "anger_stress",
    "자신감 저하": "low_self_confidence",
    "자신에 대한 두려움": "low_self_confidence",
    "과거 회상": "rumination",
    "감정 회상": "rumination",
    "정서적 부담": "emotional_distress",
    "힘든 상황": "emotional_distress",
    "흥미 저하": "anhedonia",
    "즐거움 없음": "anhedonia",
    "무쾌감": "anhedonia",
    "식욕 없음": "appetite_change",
    "식욕 저하": "appetite_change",
    "폭식": "appetite_change",
    "초조함": "psychomotor_change",
    "안절부절": "psychomotor_change",
    "몸이 무거움": "psychomotor_change",
    "무가치감": "worthlessness",
    "죄책감": "worthlessness",
    "자책": "worthlessness",
    "집중력 저하": "concentration_difficulty",
    "멍함": "concentration_difficulty",
    "결정 어려움": "concentration_difficulty",
    "죽고 싶은 생각": "suicidal_ideation",
    "자해 충동": "suicidal_ideation",
    "high_risk": "high_risk_signal",
}

MOOD_MAP = {
    "😊": "good",
    "😐": "neutral",
    "😢": "sad",
    "😞": "depressed",
    "😤": "angry",
    "😰": "anxious",
    "😫": "tired",
    "🥰": "proud",
}

# 쿼리 텍스트 키워드 → 무드 노드 매핑
QUERY_MOOD_KEYWORDS = {
    "슬프": "sad", "슬픔": "sad",
    "우울": "depressed",
    "화나": "angry", "짜증": "angry",
    "불안": "anxious", "걱정": "anxious",
    "피곤": "tired", "지쳐": "tired", "힘들": "tired",
    "뿌듯": "proud",
    "기쁘": "good", "기분 좋": "good",
}

# 수면 관련 키워드 집합
SLEEP_KEYWORDS = {"잠", "수면", "못 자", "잠들기", "일찍 깼", "악몽", "자다가 깼", "수면 부족"}

# 사용자 자연어 발화 → 증상 노드 매핑
# CAUSE_TO_SYMPTOM은 GPT 출력(정형 cause 텍스트)용, 이 dict는 사용자 발화 직접 매칭용
QUERY_KEYWORD_TO_SYMPTOM = {
    # 무기력
    "기운이 없": "lethargy",
    "기운 없": "lethargy",
    "힘이 없": "lethargy",
    "의욕이 없": "lethargy",
    "의욕 없": "lethargy",
    "아무것도 하기 싫": "lethargy",
    "아무 의욕": "lethargy",
    # 수면 문제
    "잠을 못": "sleep_problem",
    "잠이 안": "sleep_problem",
    "잠 못": "sleep_problem",
    "잠들기": "sleep_problem",
    # 우울감
    "우울": "depressed_mood",
    "슬프": "depressed_mood",
    "기분이 안": "depressed_mood",
    # 불안
    "불안": "anxiety",
    "걱정": "anxiety",
    "두려": "anxiety",
    "무서": "anxiety",
    # 피로
    "피곤": "fatigue",
    "지쳐": "fatigue",
    "지치": "fatigue",
    "힘들": "fatigue",
    # 외로움
    "외로": "loneliness",
    "혼자인 것": "loneliness",
    "외톨이": "loneliness",
    # 스트레스
    "스트레스": "stress",
    # 흥미 저하/무쾌감
    "재미없": "anhedonia",
    "재미가 없": "anhedonia",
    "즐겁지": "anhedonia",
    "흥미가 없": "anhedonia",
    "아무것도 재미": "anhedonia",
    "예전엔 좋아했": "anhedonia",
    # 식욕 변화
    "밥이 안": "appetite_change",
    "식욕이 없": "appetite_change",
    "밥을 못": "appetite_change",
    "먹기 싫": "appetite_change",
    # 무가치감/죄책감
    "쓸모없": "worthlessness",
    "자책": "worthlessness",
    "죄책감": "worthlessness",
    "내 잘못": "worthlessness",
    # 집중력 저하
    "집중이 안": "concentration_difficulty",
    "집중할 수": "concentration_difficulty",
    "멍하": "concentration_difficulty",
    # 초조/몸 무거움
    "초조": "psychomotor_change",
    "안절부절": "psychomotor_change",
    "몸이 무거": "psychomotor_change",
    # 자살/자해
    "죽고 싶": "suicidal_ideation",
    "사라지고 싶": "suicidal_ideation",
    "없어지고 싶": "suicidal_ideation",
    "자해": "suicidal_ideation",
    "자살": "high_risk_signal",
}

NODE_LABELS = {
    # Symptom
    "sleep_problem": "수면 문제",
    "lethargy": "무기력",
    "depressed_mood": "우울감",
    "loneliness": "외로움",
    "relationship_stress": "관계 스트레스",
    "anxiety": "불안",
    "fatigue": "피로",
    "stress": "스트레스",
    "career_stress": "취업/진로 스트레스",
    "work_stress": "업무/직장 스트레스",
    "anger_stress": "분노/짜증",
    "low_self_confidence": "자신감 저하",
    "rumination": "반복적 회상",
    "emotional_distress": "정서적 부담",
    "high_risk_signal": "높은 정서적 위험 신호",
    "anhedonia": "흥미/즐거움 상실",
    "appetite_change": "식욕 변화",
    "psychomotor_change": "초조/몸 무거움",
    "worthlessness": "무가치감/죄책감",
    "concentration_difficulty": "집중력 저하",
    "suicidal_ideation": "자살/자해 생각",

    # SleepPattern
    "short_sleep": "짧은 수면",
    "adequate_sleep": "수면 시간 양호",
    "over_sleep": "과다 수면",
    "poor_quality": "낮은 수면 질",
    "fair_quality": "보통 수면 질",
    "good_quality": "좋은 수면 질",
    "woke_during_sleep": "자다가 깸",
    "difficulty_falling_asleep": "잠들기 어려움",
    "shallow_sleep": "깊은 잠을 못 잠",
    "early_wakeup": "너무 일찍 깸",
    "late_sleep": "늦은 취침",
    "nightmare": "악몽",

    # Mood
    "good": "좋음",
    "neutral": "보통",
    "sad": "슬픔",
    "depressed": "우울",
    "angry": "화남",
    "anxious": "불안",
    "tired": "지침",
    "proud": "뿌듯",

    # RiskLevel
    "level_0": "정상",
    "level_1": "경미",
    "level_2": "중간",
    "level_3": "높음",
}


def _date_from_datetime(value: str | None) -> str | None:
    if not value:
        return None
    return str(value)[:10]


def _parse_json_list(value) -> list:
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def _normalize_mood(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = str(raw).strip()
    return MOOD_MAP.get(raw, raw)


def _symptoms_from_cause(cause: str | None) -> set[str]:
    symptoms = set()
    if not cause:
        return symptoms

    for keyword, symptom in CAUSE_TO_SYMPTOM.items():
        if keyword in cause:
            symptoms.add(symptom)
    return symptoms


def _sleep_patterns(hours: float | None, quality: str | None, issues: list) -> set[str]:
    patterns = set()

    if hours is not None:
        sleep_hours = float(hours)
        if sleep_hours < 7:
            patterns.add("short_sleep")
        elif sleep_hours <= 9:
            patterns.add("adequate_sleep")
        else:
            patterns.add("over_sleep")

    if quality:
        quality_map = {
            "poor": "poor_quality",
            "fair": "fair_quality",
            "good": "good_quality",
        }
        patterns.add(quality_map.get(quality, "fair_quality"))

    joined_issues = " ".join(str(issue) for issue in issues)
    if "잠들기 어려웠음" in joined_issues:
        patterns.add("difficulty_falling_asleep")
    if "자다가 깼음" in joined_issues:
        patterns.add("woke_during_sleep")
    if "깊은 잠을 못 잤음" in joined_issues:
        patterns.add("shallow_sleep")
    if "악몽을 꿨음" in joined_issues:
        patterns.add("nightmare")
    if "너무 일찍 깼음" in joined_issues:
        patterns.add("early_wakeup")
    if "너무 늦게 잠들었음" in joined_issues:
        patterns.add("late_sleep")

    return patterns


def _risk_from_prob(prob: float | None) -> int | None:
    if prob is None:
        return None
    if prob >= 0.7:
        return 3
    if prob >= 0.5:
        return 2
    if prob >= 0.3:
        return 1
    return 0


def _add_category_node(G: nx.DiGraph, node_type: str, key: str) -> str:
    node_id = f"{node_type}_{key}"
    G.add_node(
        node_id,
        type=node_type,
        key=key,
        label=NODE_LABELS.get(key, key),
    )
    return node_id


# ============================================================
# GraphRAG 헬퍼
# ============================================================
def _extract_anchor_nodes(G: nx.DiGraph, query: str) -> list[str]:
    """쿼리 텍스트 키워드를 그래프 노드에 매핑하여 앵커 노드 목록을 반환한다."""
    if not query:
        return []

    matched: set[str] = set()

    # 1. 증상 노드 — 자연어 발화 매칭 (QUERY_KEYWORD_TO_SYMPTOM 우선)
    for keyword, symptom in QUERY_KEYWORD_TO_SYMPTOM.items():
        if keyword in query:
            node_id = f"symptom_{symptom}"
            if node_id in G:
                matched.add(node_id)

    # 1-2. 정형 cause 표현도 보조 매칭 (CAUSE_TO_SYMPTOM)
    for keyword, symptom in CAUSE_TO_SYMPTOM.items():
        if keyword in query:
            node_id = f"symptom_{symptom}"
            if node_id in G:
                matched.add(node_id)

    # 2. 무드 노드
    for keyword, mood in QUERY_MOOD_KEYWORDS.items():
        if keyword in query:
            node_id = f"mood_{mood}"
            if node_id in G:
                matched.add(node_id)

    # 3. 수면 키워드 → 그래프에 존재하는 수면 패턴 노드 전체 추가
    if any(kw in query for kw in SLEEP_KEYWORDS):
        for node_id, data in G.nodes(data=True):
            if data.get("type") == "sleep_pattern":
                matched.add(node_id)

    return list(matched)


def _get_episodes_for_anchors(G: nx.DiGraph, anchor_nodes: list[str]) -> list[str]:
    """앵커 노드와 연결된 에피소드 노드를 날짜 순으로 반환한다."""
    relevant: set[str] = set()
    for anchor in anchor_nodes:
        for pred in G.predecessors(anchor):
            if G.nodes[pred].get("type") == "episode":
                relevant.add(pred)
    return sorted(relevant, key=lambda n: G.nodes[n].get("date") or "")


def _describe_episode(G: nx.DiGraph, episode_node: str) -> dict:
    """에피소드 노드의 연결 관계를 구조화된 dict로 반환한다."""
    data = G.nodes[episode_node]
    symptoms: list[str] = []
    sleep_patterns: list[str] = []
    moods: list[str] = []
    risk_level = data.get("risk_level")

    for _, target, edge_data in G.out_edges(episode_node, data=True):
        target_data = G.nodes[target]
        rel = edge_data.get("rel")
        label = target_data.get("label", target_data.get("key", ""))
        if rel == "HAS_SYMPTOM":
            symptoms.append(label)
        elif rel == "HAS_SLEEP":
            sleep_patterns.append(label)
        elif rel == "HAS_MOOD":
            moods.append(label)
        elif rel == "HAS_RISK":
            risk_level = target_data.get("level", risk_level)

    return {
        "date": data.get("date"),
        "risk_level": risk_level,
        "sleep_hours": data.get("sleep_hours"),
        "symptoms": symptoms,
        "sleep_patterns": sleep_patterns,
        "moods": moods,
    }


def _find_cross_patterns(G: nx.DiGraph, episode_nodes: list[str]) -> list[dict]:
    """여러 에피소드에서 반복되는 증상과 해당 에피소드들의 평균 위험도를 분석한다."""
    symptom_risks: dict[str, list] = defaultdict(list)

    for ep_node in episode_nodes:
        risk = G.nodes[ep_node].get("risk_level")
        for _, target, edge_data in G.out_edges(ep_node, data=True):
            if edge_data.get("rel") == "HAS_SYMPTOM":
                label = G.nodes[target].get("label", "")
                if label:
                    symptom_risks[label].append(risk)

    patterns = []
    for symptom, risks in sorted(symptom_risks.items(), key=lambda x: -len(x[1])):
        count = len(risks)
        if count < 2:
            continue
        valid_risks = [r for r in risks if r is not None]
        patterns.append({
            "symptom": symptom,
            "episode_count": count,
            "avg_risk": round(sum(valid_risks) / len(valid_risks), 1) if valid_risks else None,
        })

    return patterns[:5]


def _analyze_temporal_chains(G: nx.DiGraph, episode_nodes: list[str]) -> dict:
    """
    날짜 순으로 정렬된 에피소드 체인(NEXT 엣지)을 따라 세 가지 시계열 패턴을 분석한다.
      1. 위험도 연속 추이 — 최근 N개 에피소드의 위험도가 연속 상승/하락 중인지
      2. 증상 연속 스트릭 — 특정 증상이 최근 N일 연속으로 나타나는지
      3. 당일 증상 → 다음날 위험도 상관 — 어떤 증상이 있던 날의 다음날 위험도 평균
    """
    if len(episode_nodes) < 2:
        return {}

    # 에피소드별 증상·위험도 수집
    ep_data: list[dict] = []
    for ep_node in episode_nodes:
        data = G.nodes[ep_node]
        symptoms: set[str] = set()
        for _, target, edge_data in G.out_edges(ep_node, data=True):
            if edge_data.get("rel") == "HAS_SYMPTOM":
                label = G.nodes[target].get("label", "")
                if label:
                    symptoms.add(label)
        ep_data.append({
            "date": data.get("date"),
            "risk": data.get("risk_level"),
            "symptoms": symptoms,
        })

    result: dict = {}

    # ── 1. 위험도 연속 추이 (최근 기준 역방향 탐지) ──────────
    risk_values = [ep["risk"] for ep in ep_data if ep["risk"] is not None]
    if len(risk_values) >= 2:
        streak_len = 1
        direction: str | None = None
        for i in range(len(risk_values) - 1, 0, -1):
            diff = risk_values[i] - risk_values[i - 1]
            cur_dir = "up" if diff > 0 else ("down" if diff < 0 else "stable")
            if direction is None:
                direction = cur_dir
            if cur_dir == direction and direction != "stable":
                streak_len += 1
            else:
                break
        if direction and direction != "stable" and streak_len >= 2:
            result["risk_streak"] = {
                "direction": direction,
                "length": streak_len,
                "latest_risk": risk_values[-1],
            }

    # ── 2. 증상 연속 스트릭 (최근 연속 출현 일수) ────────────
    all_symptoms: set[str] = set()
    for ep in ep_data:
        all_symptoms.update(ep["symptoms"])

    streaks = []
    for symptom in all_symptoms:
        days = 0
        for ep in reversed(ep_data):
            if symptom in ep["symptoms"]:
                days += 1
            else:
                break
        if days >= 2:
            streaks.append({"symptom": symptom, "days": days})

    if streaks:
        result["symptom_streaks"] = sorted(streaks, key=lambda x: -x["days"])[:5]

    # ── 3. 당일 증상 → 다음날 위험도 상관 ────────────────────
    day_after: dict[str, list[int]] = defaultdict(list)
    for i in range(len(ep_data) - 1):
        nxt_risk = ep_data[i + 1]["risk"]
        if nxt_risk is None:
            continue
        for symptom in ep_data[i]["symptoms"]:
            day_after[symptom].append(nxt_risk)

    correlations = [
        {
            "trigger_symptom": sym,
            "avg_next_day_risk": round(sum(risks) / len(risks), 1),
            "sample_count": len(risks),
        }
        for sym, risks in day_after.items()
        if len(risks) >= 2
    ]
    if correlations:
        result["day_after_correlations"] = sorted(
            correlations, key=lambda x: -x["avg_next_day_risk"]
        )[:3]

    return result


# ============================================================
# 그래프 구성
# ============================================================
def build_user_graph(user_id: int, days: int = 30) -> nx.DiGraph:
    """
    사용자의 최근 N일 데이터를 날짜별 Episode로 묶어 관계형 그래프를 구성한다.
    노드: User, Episode, Symptom, SleepPattern, RiskLevel, Mood
    엣지: HAS_EPISODE, HAS_SYMPTOM, HAS_SLEEP, HAS_RISK, HAS_MOOD, NEXT
    """
    G = nx.DiGraph()
    conn = sqlite3.connect(MINDCARE_DB)
    cur = conn.cursor()

    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    cur.execute("""
        SELECT id, nickname, age, gender
        FROM users
        WHERE id = ?
    """, (user_id,))
    user_row = cur.fetchone()

    if not user_row:
        conn.close()
        return G

    user_node = f"user_{user_id}"
    G.add_node(
        user_node,
        type="user",
        user_id=user_id,
        nickname=user_row[1],
        age=user_row[2],
        gender=user_row[3],
    )

    episodes = defaultdict(lambda: {
        "date": None,
        "messages": [],
        "causes": [],
        "symptoms": set(),
        "sleep_patterns": set(),
        "moods": set(),
        "risk_levels": [],
        "kluebert_probs": [],
        "sleep_hours": [],
        "sleep_qualities": [],
        "sleep_issues": [],
        "critical_count": 0,
    })

    cur.execute("""
        SELECT id, message, depression_level, kluebert_prob,
               target_date, created_date
        FROM chat_logs
        WHERE user_id = ?
          AND role = 'user'
          AND created_date >= ?
        ORDER BY created_date ASC
    """, (user_id, since))

    for row in cur.fetchall():
        cid, message, dep_level, kluebert_prob, target_date, created_date = row
        episode_date = target_date or _date_from_datetime(created_date)
        if not episode_date:
            continue

        episode = episodes[episode_date]
        episode["date"] = episode_date
        episode["messages"].append({
            "id": cid,
            "message": message,
            "created_date": created_date,
        })
        if dep_level is not None:
            episode["risk_levels"].append(int(dep_level))
        if kluebert_prob is not None:
            episode["kluebert_probs"].append(float(kluebert_prob))
            prob_level = _risk_from_prob(float(kluebert_prob))
            if prob_level is not None:
                episode["risk_levels"].append(prob_level)

    cur.execute("""
        SELECT cause, target_date, created_date
        FROM chat_logs
        WHERE user_id = ?
          AND role = 'assistant'
          AND cause IS NOT NULL
          AND created_date >= ?
        ORDER BY created_date ASC
    """, (user_id, since))

    for row in cur.fetchall():
        cause, target_date, created_date = row
        episode_date = target_date or _date_from_datetime(created_date)
        if not episode_date:
            continue

        episode = episodes[episode_date]
        episode["date"] = episode_date
        if cause:
            episode["causes"].append(cause)
        episode["symptoms"].update(_symptoms_from_cause(cause))

    cur.execute("""
        SELECT date, hours, quality, issues
        FROM sleep_logs
        WHERE user_id = ?
          AND date >= ?
        ORDER BY date ASC
    """, (user_id, since))

    for row in cur.fetchall():
        date, hours, quality, issues_raw = row
        if not date:
            continue

        issues = _parse_json_list(issues_raw)
        episode = episodes[date]
        episode["date"] = date
        if hours is not None:
            episode["sleep_hours"].append(float(hours))
        if quality:
            episode["sleep_qualities"].append(quality)
        episode["sleep_issues"].extend(issues)
        episode["sleep_patterns"].update(_sleep_patterns(hours, quality, issues))
        if issues:
            episode["symptoms"].add("sleep_problem")

    cur.execute("""
        SELECT created_date, mood
        FROM diaries
        WHERE user_id = ?
          AND created_date >= ?
        ORDER BY created_date ASC
    """, (user_id, since))

    for row in cur.fetchall():
        created_date, mood = row
        episode_date = _date_from_datetime(created_date)
        if not episode_date:
            continue

        episode = episodes[episode_date]
        episode["date"] = episode_date
        normalized_mood = _normalize_mood(mood)
        if normalized_mood:
            episode["moods"].add(normalized_mood)

    cur.execute("""
        SELECT depression_level, cause, created_date
        FROM critical_conversations
        WHERE user_id = ?
          AND created_date >= ?
        ORDER BY created_date ASC
    """, (user_id, since))

    for row in cur.fetchall():
        dep_level, cause, created_date = row
        episode_date = _date_from_datetime(created_date)
        if not episode_date:
            continue

        episode = episodes[episode_date]
        episode["date"] = episode_date
        episode["critical_count"] += 1
        episode["symptoms"].add("high_risk_signal")
        episode["symptoms"].update(_symptoms_from_cause(cause))
        if dep_level is not None:
            episode["risk_levels"].append(int(dep_level))

    conn.close()

    sorted_dates = sorted(episodes)
    previous_episode_node = None

    for episode_date in sorted_dates:
        episode = episodes[episode_date]
        risk_level = max(episode["risk_levels"]) if episode["risk_levels"] else None
        avg_prob = (
            sum(episode["kluebert_probs"]) / len(episode["kluebert_probs"])
            if episode["kluebert_probs"] else None
        )
        avg_sleep_hours = (
            sum(episode["sleep_hours"]) / len(episode["sleep_hours"])
            if episode["sleep_hours"] else None
        )

        episode_node = f"episode_{user_id}_{episode_date}"
        G.add_node(
            episode_node,
            type="episode",
            date=episode_date,
            messages=episode["messages"],
            causes=episode["causes"],
            risk_level=risk_level,
            avg_kluebert_prob=round(avg_prob, 3) if avg_prob is not None else None,
            sleep_hours=round(avg_sleep_hours, 1) if avg_sleep_hours is not None else None,
            sleep_issues=episode["sleep_issues"],
            critical_count=episode["critical_count"],
        )
        G.add_edge(user_node, episode_node, rel="HAS_EPISODE")

        for symptom in sorted(episode["symptoms"]):
            node_id = _add_category_node(G, "symptom", symptom)
            G.add_edge(episode_node, node_id, rel="HAS_SYMPTOM")

        for pattern in sorted(episode["sleep_patterns"]):
            node_id = _add_category_node(G, "sleep_pattern", pattern)
            G.add_edge(episode_node, node_id, rel="HAS_SLEEP")

        if risk_level is not None:
            node_id = f"risk_level_{risk_level}"
            risk_key = f"level_{risk_level}"
            G.add_node(
                node_id,
                type="risk_level",
                level=risk_level,
                key=risk_key,
                label=NODE_LABELS.get(risk_key, risk_key),
            )
            G.add_edge(episode_node, node_id, rel="HAS_RISK")

        for mood in sorted(episode["moods"]):
            node_id = _add_category_node(G, "mood", mood)
            G.add_edge(episode_node, node_id, rel="HAS_MOOD")

        if previous_episode_node:
            G.add_edge(previous_episode_node, episode_node, rel="NEXT")
        previous_episode_node = episode_node

    return G


# ============================================================
# 그래프 컨텍스트 추출
# ============================================================
def extract_graph_context(G: nx.DiGraph, user_id: int, query: str = "") -> dict:
    """
    Episode 중심 그래프에서 GPT 프롬프트에 필요한 컨텍스트를 추출한다.
    query가 있으면 쿼리 키워드를 앵커로 관련 서브그래프를 동적 순회하고,
    없으면 전체 집계 요약(baseline)만 반환한다.
    """
    user_node = f"user_{user_id}"
    if user_node not in G:
        return {}

    episode_nodes = [
        node_id
        for node_id in G.successors(user_node)
        if G.nodes[node_id].get("type") == "episode"
    ]
    episode_nodes = sorted(episode_nodes, key=lambda node_id: G.nodes[node_id].get("date") or "")

    if not episode_nodes:
        return {"user": G.nodes[user_node]}

    episodes = [G.nodes[node_id] for node_id in episode_nodes]

    # ── 전체 집계 (baseline) ──────────────────────────────
    sleep_hours_list = [ep["sleep_hours"] for ep in episodes if ep.get("sleep_hours") is not None]
    sleep_stats = None
    if sleep_hours_list:
        all_issues: list = []
        for ep in episodes:
            all_issues.extend(ep.get("sleep_issues") or [])
        sleep_stats = {
            "avg_hours": round(sum(sleep_hours_list) / len(sleep_hours_list), 1),
            "common_issues": [issue for issue, _ in Counter(all_issues).most_common(3)],
            "total_logs": len(sleep_hours_list),
        }

    risk_levels = [ep["risk_level"] for ep in episodes if ep.get("risk_level") is not None]
    probs = [ep["avg_kluebert_prob"] for ep in episodes if ep.get("avg_kluebert_prob") is not None]
    depression_trend = None
    if risk_levels:
        depression_trend = {
            "levels": risk_levels[-5:],
            "avg_prob": round(sum(probs) / len(probs), 3) if probs else None,
            "latest": risk_levels[-1],
            "total_episodes": len(risk_levels),
        }

    symptom_counts: Counter = Counter()
    sleep_pattern_counts: Counter = Counter()
    mood_counts: Counter = Counter()
    for ep_node in episode_nodes:
        for _, target, edge in G.out_edges(ep_node, data=True):
            target_node = G.nodes[target]
            key = target_node.get("key")
            label = target_node.get("label")
            if not key:
                continue
            if edge.get("rel") == "HAS_SYMPTOM":
                symptom_counts[label] += 1
            elif edge.get("rel") == "HAS_SLEEP":
                sleep_pattern_counts[label] += 1
            elif edge.get("rel") == "HAS_MOOD":
                mood_counts[label] += 1

    critical_count = sum(ep.get("critical_count", 0) for ep in episodes)

    baseline = {
        "sleep_stats": sleep_stats,
        "depression_trend": depression_trend,
        "symptom_summary": {
            "top_symptoms": [label for label, _ in symptom_counts.most_common(5)],
        } if symptom_counts else None,
        "sleep_pattern_summary": {
            "top_patterns": [label for label, _ in sleep_pattern_counts.most_common(5)],
        } if sleep_pattern_counts else None,
        "mood_summary": {
            "recent_moods": [label for label, _ in mood_counts.most_common(5)],
            "total_diaries": sum(mood_counts.values()),
        } if mood_counts else None,
        "critical_summary": {"count": critical_count} if critical_count else None,
    }

    try:
        temporal_chains = _analyze_temporal_chains(G, episode_nodes)
    except Exception as e:
        print(f"[Graph] temporal_chains 분석 실패: {e}")
        temporal_chains = {}

    result: dict = {
        "user": G.nodes[user_node],
        "episodes": [
            {
                "date": ep.get("date"),
                "risk_level": ep.get("risk_level"),
                "sleep_hours": ep.get("sleep_hours"),
                "critical_count": ep.get("critical_count", 0),
            }
            for ep in episodes
        ],
        "baseline": baseline,
        "temporal_chains": temporal_chains,
        "query_context": None,
    }

    # ── GraphRAG: 쿼리 기반 동적 서브그래프 순회 ────────────
    if query:
        try:
            anchor_nodes = _extract_anchor_nodes(G, query)
            relevant_ep_nodes = _get_episodes_for_anchors(G, anchor_nodes) if anchor_nodes else episode_nodes
        except Exception as e:
            print(f"[Graph] 앵커 노드 탐색 실패: {e}")
            anchor_nodes = []
            relevant_ep_nodes = episode_nodes

        try:
            described_episodes = [_describe_episode(G, ep) for ep in relevant_ep_nodes]
        except Exception as e:
            print(f"[Graph] 에피소드 기술 실패: {e}")
            described_episodes = []

        try:
            cross_patterns = _find_cross_patterns(G, relevant_ep_nodes)
        except Exception as e:
            print(f"[Graph] 패턴 분석 실패: {e}")
            cross_patterns = []

        result["query_context"] = {
            "matched_nodes": [
                {
                    "node_id": n,
                    "label": G.nodes[n].get("label", ""),
                    "type": G.nodes[n].get("type", ""),
                }
                for n in anchor_nodes
            ],
            "relevant_episodes": described_episodes,
            "cross_patterns": cross_patterns,
        }

    return result


# ============================================================
# 프롬프트 문자열 생성
# ============================================================
def build_graph_prompt(context: dict) -> str:
    if not context:
        return "사용자의 최근 기록이 없습니다."

    lines = ["[현재 사용자 상태 요약]"]
    level_map = {0: "정상", 1: "경미", 2: "중등도", 3: "심각"}

    # ── GraphRAG 쿼리 탐색 결과 ──────────────────────────────
    qctx = context.get("query_context")
    if qctx and qctx.get("matched_nodes"):
        matched_labels = [n["label"] for n in qctx["matched_nodes"] if n.get("label")]
        if matched_labels:
            lines.append("\n[쿼리 관련 그래프 탐색 결과]")
            lines.append(f"- 현재 발화와 연관된 기록 항목: {', '.join(matched_labels)}")

        rel_episodes = qctx.get("relevant_episodes") or []
        if rel_episodes:
            lines.append(f"- 관련 에피소드 ({len(rel_episodes)}건):")
            for ep in rel_episodes[-5:]:
                lines.append(f"  · {ep.get('date', '?')}")
                if ep.get("symptoms"):
                    lines.append(f"    증상: {', '.join(ep['symptoms'])}")
                if ep.get("sleep_patterns"):
                    lines.append(f"    수면 패턴: {', '.join(ep['sleep_patterns'])}")
                if ep.get("moods"):
                    lines.append(f"    감정: {', '.join(ep['moods'])}")
                if ep.get("risk_level") is not None:
                    lines.append(f"    위험도: {level_map.get(ep['risk_level'], str(ep['risk_level']))}")
                if ep.get("sleep_hours") is not None:
                    lines.append(f"    수면: {ep['sleep_hours']}h")
                if not any([ep.get("symptoms"), ep.get("sleep_patterns"), ep.get("moods"),
                            ep.get("risk_level") is not None, ep.get("sleep_hours") is not None]):
                    lines.append("    기록 없음")

        patterns = qctx.get("cross_patterns") or []
        if patterns:
            lines.append("- 반복 패턴:")
            for p in patterns:
                avg = p.get("avg_risk")
                risk_str = level_map.get(round(avg), f"{avg:.1f}") if avg is not None else "알 수 없음"
                lines.append(
                    f"  · '{p['symptom']}'이/가 최근 {p['episode_count']}개 에피소드에서 반복 "
                    f"(평균 위험도: {risk_str})"
                )

    # ── 시계열 패턴 (temporal_chains) ────────────────────────
    tc = context.get("temporal_chains") or {}

    tc_lines: list[str] = []

    risk_streak = tc.get("risk_streak")
    if risk_streak:
        dir_text = "연속 상승" if risk_streak["direction"] == "up" else "연속 하락"
        latest = level_map.get(risk_streak["latest_risk"], str(risk_streak["latest_risk"]))
        tc_lines.append(
            f"- 위험도 {dir_text} 중 (최근 {risk_streak['length']}개 에피소드, 현재: {latest})"
        )

    symptom_streaks = tc.get("symptom_streaks") or []
    if symptom_streaks:
        streak_parts = [f"'{s['symptom']}' {s['days']}일 연속" for s in symptom_streaks]
        tc_lines.append(f"- 연속 증상: {', '.join(streak_parts)}")

    day_after = tc.get("day_after_correlations") or []
    for corr in day_after:
        avg = corr["avg_next_day_risk"]
        risk_str = level_map.get(round(avg), f"{avg:.1f}")
        tc_lines.append(
            f"- '{corr['trigger_symptom']}'이/가 있던 날의 다음날 평균 위험도: {risk_str} ({corr['sample_count']}건)"
        )

    if tc_lines:
        lines.append("\n[시계열 패턴]")
        lines.extend(tc_lines)

    # ── 전체 추이 (baseline) ──────────────────────────────────
    # 이전 형식 호환: baseline 키가 없으면 context 자체를 fallback으로 사용
    baseline = context.get("baseline") or context

    baseline_lines: list[str] = []

    sleep = baseline.get("sleep_stats")
    if sleep:
        if sleep["avg_hours"] < 7:
            sleep_text = "최근 수면 시간이 짧은 편입니다"
        elif sleep["avg_hours"] <= 9:
            sleep_text = "최근 수면 시간이 양호한 편입니다"
        else:
            sleep_text = "최근 수면 시간이 과다한 편입니다"
        if sleep["common_issues"]:
            sleep_text += f"; 반복된 수면 문제로 {', '.join(sleep['common_issues'])} 항목이 보입니다"
        baseline_lines.append(f"- {sleep_text}.")

    sleep_patterns = baseline.get("sleep_pattern_summary")
    if sleep_patterns and sleep_patterns["top_patterns"]:
        baseline_lines.append(f"- 최근 수면 패턴에는 {', '.join(sleep_patterns['top_patterns'])}이/가 반복됩니다.")

    trend = baseline.get("depression_trend")
    if trend:
        levels = trend["levels"]
        level_str = " → ".join(level_map.get(lv, str(lv)) for lv in levels)
        if len(levels) >= 2 and levels[-1] < levels[0]:
            trend_text = "낮아지는 흐름이 있습니다"
        elif len(levels) >= 2 and levels[-1] > levels[0]:
            trend_text = "높아지는 흐름이 있습니다"
        else:
            trend_text = "큰 변화 없이 이어지는 흐름입니다"
        latest = level_map.get(trend["latest"], "알 수 없음")
        baseline_lines.append(f"- 최근 우울 진단은 {trend_text}; 흐름은 {level_str}, 최근 상태는 {latest}입니다.")

    symptoms = baseline.get("symptom_summary")
    if symptoms and symptoms["top_symptoms"]:
        baseline_lines.append(f"- 최근 반복적으로 연결된 증상은 {', '.join(symptoms['top_symptoms'])}입니다.")

    mood = baseline.get("mood_summary")
    if mood and mood["recent_moods"]:
        baseline_lines.append(f"- 최근 감정 기록에는 {', '.join(mood['recent_moods'])} 감정이 나타났습니다.")

    critical = baseline.get("critical_summary")
    if critical:
        baseline_lines.append(f"- 최근 일부 표현에서 정서적 부담이 높게 나타난 기록이 {critical['count']}건 있습니다.")

    if baseline_lines:
        lines.append("\n[전체 추이]")
        lines.extend(baseline_lines)

    if len(lines) == 1:
        lines.append("- 최근 기록에서 뚜렷한 패턴은 아직 확인되지 않았습니다.")

    return "\n".join(lines)
