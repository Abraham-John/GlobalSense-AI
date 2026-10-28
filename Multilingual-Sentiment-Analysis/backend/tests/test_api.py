"""
Integration tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_model_info_endpoint():
    response = client.get("/api/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "active_model_key" in data
    assert "classes" in data
    assert data["classes"] == ["Positive", "Negative", "Neutral"]
    assert "supported_languages" in data
    assert len(data["supported_languages"]) == 10


def test_analyze_endpoint_valid():
    payload = {
        "text": "This movie was absolutely fantastic, great storytelling!",
        "explain": True
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] in ["Positive", "Negative", "Neutral", "Uncertain"]
    assert "raw_sentiment" in data
    assert "probabilities" in data
    assert "explanation" in data
    assert data["explanation"]["method"] == "occlusion-based importance"
    assert "statistics" in data
    assert data["statistics"]["word_count"] > 0


def test_analyze_endpoint_empty():
    response = client.post("/api/analyze", json={"text": ""})
    assert response.status_code == 422 or response.status_code == 400


def test_batch_analyze_endpoint():
    payload = {
        "texts": [
            "Superb experience, highly recommended!",
            "Terrible service and awful quality.",
            "The movie was two hours long."
        ]
    }
    response = client.post("/api/analyze/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_submitted"] == 3
    assert data["processed_count"] == 3
    assert len(data["results"]) == 3
    assert data["skipped_count"] == 0


def test_batch_upload_csv():
    csv_content = "text\nAmazing product!\nAwful experience.\nJust a normal item.\n"
    files = {"file": ("test.csv", csv_content.encode("utf-8"), "text/csv")}
    response = client.post("/api/analyze/upload-csv?text_column=text", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["processed_count"] == 3
    assert len(data["results"]) == 3


def test_analytics_endpoint():
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["success", "not_generated"]
    if data["status"] == "success":
        assert "dataset_statistics" in data
        assert "model_comparison" in data
