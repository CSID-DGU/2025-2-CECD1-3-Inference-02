import json
import os
import numpy as np
import torch
import torch.nn as nn
from transformers import AutoConfig, AutoTokenizer, BertModel

# =========================
# 기본 설정
# =========================
MODEL_DIR = "./saved_model"
#DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DEVICE = "cpu"
NUM_MAIN_LABELS = 2
CORE_TABULAR_SIZE = 3 # 나이(1) + 성별(2)
NUM_AUX_FEATURES = 12  # 감정 지표 개수
TABULAR_EMB_SIZE = 64 # 정형 데이터 변환 임베딩 차원

# =========================
# 모델 정의
# =========================
class CustomBertForMTL(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.config = config

        # 저장된 전체 state_dict를 로드할 것이므로
        # 여기서는 config 기반으로 skeleton만 생성
        self.bert = BertModel(config)

        self.tabular_input_size = CORE_TABULAR_SIZE + NUM_AUX_FEATURES
        self.tabular_linear = nn.Linear(self.tabular_input_size, TABULAR_EMB_SIZE)

        self.main_head_input_size = config.hidden_size + CORE_TABULAR_SIZE
        self.aux_head_input_size = config.hidden_size + TABULAR_EMB_SIZE

        self.main_head = nn.Linear(self.main_head_input_size, NUM_MAIN_LABELS)
        self.aux_head = nn.Linear(self.aux_head_input_size, NUM_AUX_FEATURES)

        self.main_loss_fn = nn.CrossEntropyLoss() 
        self.aux_loss_fn = nn.MSELoss() 

    def forward(
            self, 
            input_ids=None, 
            attention_mask=None,
            core_tabular_data=None, 
            aux_tabular_data=None,
            labels=None, 
            aux_labels=None, 
            main_loss_weight=1.0, 
            aux_loss_weight=0.5
    ):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        text_emb = outputs.pooler_output

        main_input = torch.cat([text_emb, core_tabular_data.float()], dim=1)
        main_logits = self.main_head(main_input)

        aux_preds = None
        if aux_tabular_data is not None:   # aux가 있을 때만 보조 헤드 실행
            all_tabular_input = torch.cat([core_tabular_data, aux_tabular_data], dim=1).float()
            full_tabular_emb = torch.relu(self.tabular_linear(all_tabular_input))
            aux_input = torch.cat([text_emb, full_tabular_emb], dim=1)
            aux_preds = self.aux_head(aux_input)

        total_loss = None
        if labels is not None and aux_labels is not None:
            main_loss = self.main_loss_fn(main_logits, labels)
            aux_loss = self.aux_loss_fn(aux_preds, aux_labels.float())
            total_loss = main_loss_weight * main_loss + aux_loss_weight * aux_loss

        if total_loss is not None:
            return total_loss, main_logits, aux_preds

        return (main_logits,)

# =========================
# 필수 파일 확인
# =========================
required_files = [
    os.path.join(MODEL_DIR, "config.json"),
    os.path.join(MODEL_DIR, "pytorch_model.bin"),
    os.path.join(MODEL_DIR, "preprocess_meta.json"),
]

for path in required_files:
    if not os.path.exists(path):
        raise FileNotFoundError(f"필수 파일이 없습니다: {path}")
    
# =========================
# 토크나이저 / 모델 로드
# =========================
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)

config = AutoConfig.from_pretrained(MODEL_DIR)
model = CustomBertForMTL(config)

state_dict = torch.load(
    os.path.join(MODEL_DIR, "pytorch_model.bin"),
    map_location=DEVICE
)
model.load_state_dict(state_dict)

model.to(DEVICE)
model.eval()

# =========================
# 전처리 메타 로드
# =========================
with open(os.path.join(MODEL_DIR, "preprocess_meta.json"), "r", encoding="utf-8") as f:
    meta = json.load(f)

AGE_MIN = float(meta["age_min"])
AGE_MAX = float(meta["age_max"])

# =========================
# 유틸
# =========================
def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e / np.sum(e, axis=-1, keepdims=True)


def predict_depression(text: str, age: int, gender: str):
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=128
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    inputs.pop("token_type_ids", None)

    denom = AGE_MAX - AGE_MIN
    age_norm = 0.0 if denom == 0 else (age - AGE_MIN) / denom

    gender_M = 1.0 if gender == "남" else 0.0
    gender_F = 1.0 if gender == "여" else 0.0

    core_tabular_data = torch.tensor(
        [[age_norm, gender_M, gender_F]],
        dtype=torch.float,
        device=DEVICE
    )

    with torch.no_grad():
        outputs = model(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            core_tabular_data=core_tabular_data,
        )

    logits = outputs[0].detach().cpu().numpy()
    probs = softmax(logits)[0]
    pred = int(np.argmax(logits, axis=-1)[0])

    return pred, probs