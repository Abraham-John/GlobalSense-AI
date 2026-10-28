"""
Unit tests for id2label mapping across multilingual pretrained checkpoints.
Verifies that label orders are never assumed and map explicitly to canonical [Positive, Negative, Neutral].
"""

import pytest
from scripts.evaluate_pretrained import get_id2label_mapping
from src.data_loader import LABEL_TO_ID


class DummyConfig:
    def __init__(self, id2label):
        self.id2label = id2label


def test_cardiffnlp_id2label_mapping():
    # CardiffNLP format: 0: Negative, 1: Neutral, 2: Positive
    cfg = DummyConfig({0: "Negative", 1: "Neutral", 2: "Positive"})
    mapping = get_id2label_mapping(cfg)
    assert mapping[0] == LABEL_TO_ID["Negative"]  # 1
    assert mapping[1] == LABEL_TO_ID["Neutral"]   # 2
    assert mapping[2] == LABEL_TO_ID["Positive"]  # 0


def test_lowercase_id2label_mapping():
    # Lowercase format: 0: negative, 1: neutral, 2: positive
    cfg = DummyConfig({"0": "negative", "1": "neutral", "2": "positive"})
    mapping = get_id2label_mapping(cfg)
    assert mapping[0] == 1
    assert mapping[1] == 2
    assert mapping[2] == 0


def test_permuted_id2label_mapping():
    # Permuted format: 0: Positive, 1: Negative, 2: Neutral
    cfg = DummyConfig({0: "LABEL_POSITIVE", 1: "LABEL_NEGATIVE", 2: "LABEL_NEUTRAL"})
    mapping = get_id2label_mapping(cfg)
    assert mapping[0] == LABEL_TO_ID["Positive"]  # 0
    assert mapping[1] == LABEL_TO_ID["Negative"]  # 1
    assert mapping[2] == LABEL_TO_ID["Neutral"]   # 2


def test_invalid_id2label_raises():
    cfg = DummyConfig({0: "happy", 1: "sad"})
    with pytest.raises(ValueError):
        get_id2label_mapping(cfg)
