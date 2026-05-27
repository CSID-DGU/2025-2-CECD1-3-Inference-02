'''
챗봇 테스트 스크립트

실제 서비스(ai_module.generate_reply)와 동일한 로직으로 동작한다.
GraphRAG 중간 결과(앵커 노드, 에피소드, 그래프 프롬프트)를 추가로 출력해 동작을 검증한다.

실행: python -m rag.chatbot  (backend/ 디렉터리에서)
'''

import json
from dotenv import load_dotenv

load_dotenv()

from ai_module import generate_reply, analyze_depression
from rag.graph import build_user_graph, extract_graph_context, build_graph_prompt
from rag.rag import retrieve


# ── 검증용 출력 함수 ─────────────────────────────────────────

def _sep(title: str) -> None:
    print(f"\n{'─' * 20} {title} {'─' * 20}")


def debug_graph(user_id: int, query: str) -> None:
    """그래프를 빌드하고 GraphRAG 중간 결과를 출력한다.
    generate_reply 내부에서도 동일하게 빌드되므로 이 함수는 검증용으로만 사용한다."""
    G = build_user_graph(user_id)
    ctx = extract_graph_context(G, user_id, query=query)

    qctx = ctx.get("query_context") or {}
    anchors = qctx.get("matched_nodes") or []
    episodes = qctx.get("relevant_episodes") or []

    print(f"노드: {G.number_of_nodes()} / 엣지: {G.number_of_edges()}")

    if anchors:
        labels = [n["label"] for n in anchors if n.get("label")]
        print(f"앵커 노드: {', '.join(labels)}")
        print(f"관련 에피소드: {len(episodes)}건")
    else:
        print(f"앵커 없음 → 전체 에피소드 대상 ({len(episodes)}건)")

    print()
    print(build_graph_prompt(ctx))


def debug_rag(query: str, depression_level: int, age: int, gender: str) -> None:
    """RAG 검색 결과를 출력한다."""
    try:
        min_label = max(0, depression_level - 1)
        similar = retrieve(
            query=query, top_k=5, min_label=min_label,
            age=age, gender=gender, target_level=depression_level,
        )
        print(f"{len(similar)}건 검색됨")
        for i, r in enumerate(similar, 1):
            text = r["text"][:80] + ("..." if len(r["text"]) > 80 else "")
            print(f"  {i}. score={r.get('score')} | sim={r.get('similarity')} | label={r.get('label')}")
            print(f"     {text}")
    except Exception as e:
        print(f"검색 실패: {e}")


# ── 메인 루프 ─────────────────────────────────────────────────

if __name__ == "__main__":
    TEST_USER_ID = 5
    history: list[dict] = []
    current_round = 0

    age_input   = input("나이 (기본 20): ").strip()
    gender_input = input("성별 남/여 (기본 여): ").strip()
    mode_input  = input("모드 routine/free (기본 free): ").strip()

    TEST_AGE    = int(age_input) if age_input.isdigit() else 20
    TEST_GENDER = gender_input if gender_input in ("남", "여") else "여"
    TEST_MODE   = mode_input if mode_input in ("routine", "free") else "free"

    print("\n" + "=" * 60)
    print(f"user_id={TEST_USER_ID} | {TEST_AGE}세 / {TEST_GENDER} / {TEST_MODE} 모드")
    print("종료: q")
    print("=" * 60)

    while True:
        user_input = input("\n사용자: ").strip()
        if not user_input:
            continue
        if user_input.lower() == "q":
            break

        current_round += 1

        # ── 1. 우울증 진단 (서비스와 동일: KlueBERT → 키워드 폴백) ──
        _sep("진단")
        info = analyze_depression(user_input, age=TEST_AGE, gender=TEST_GENDER)
        print(f"status={info['status']} | label={info['label']} | prob={info['prob']:.4f} | level={info['level']}")

        # ── 2. GraphRAG 검증 출력 ────────────────────────────────
        _sep("GraphRAG")
        debug_graph(TEST_USER_ID, user_input)

        # ── 3. RAG 검증 출력 ─────────────────────────────────────
        _sep("RAG")
        debug_rag(user_input, info["level"], TEST_AGE, TEST_GENDER)

        # ── 4. progress 힌트 (routine 모드만) ────────────────────
        if TEST_MODE == "routine":
            if current_round < 7:
                progress_hint = f"\n[시스템: {current_round}번째 답변. wrap_up: false, 질문으로 끝내.]"
            else:
                progress_hint = f"\n[시스템: {current_round}번째 답변. wrap_up: true, 마무리해.]"
        else:
            progress_hint = ""

        # ── 5. 실제 서비스와 동일한 generate_reply 호출 ──────────
        result = generate_reply(
            user_message=user_input,
            depression_level=info["level"],
            conversation_history=history,
            mode=TEST_MODE,
            character="default",
            user_id=TEST_USER_ID,
            age=TEST_AGE,
            gender=TEST_GENDER,
            progress_hint=progress_hint,
        )

        _sep("GPT 응답")
        print(f"cause={result['cause']} | wrap_up={result['wrap_up']} | progress={result['progress']}")
        print(f"\n챗봇: {result['reply']}")
        print("─" * 60)

        # conversation_history 포맷은 ai_module.generate_reply가 기대하는 형식과 동일하게 유지
        history.append({"role": "user", "message": user_input})
        history.append({"role": "assistant", "message": json.dumps(result, ensure_ascii=False)})
