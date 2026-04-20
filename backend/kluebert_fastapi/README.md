# Mental Health Binary Classifier API

텍스트, 나이, 성별을 입력받아 우울 여부를 0/1로 분류하는 FastAPI 서버입니다.

## 입력
- `text`: 문자열
- `age`: 정수
- `gender`: `"남"` 또는 `"여"`

## 출력
- `label`: 0 또는 1
- `status`: `"없음"` 또는 `"있음"`
- `probs`: 클래스별 확률
- `server_time_ms`: 서버 내부 처리 시간(ms)

## 폴더 구조

```text
project/
├─ app.py
├─ requirements.txt
├─ README.md
└─ saved_model/
   ├─ config.json
   ├─ pytorch_model.bin
   ├─ preprocess_meta.json
   ├─ tokenizer.json
   ├─ tokenizer_config.json
   └─ ...