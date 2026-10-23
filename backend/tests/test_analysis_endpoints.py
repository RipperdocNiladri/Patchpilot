from fastapi.testclient import TestClient
from app.dependencies import get_gemma_client
from app.main import app
from tests.conftest import MockGemmaClient


def test_explain_code_success(client: TestClient):
    payload = {
        "owner": "fastapi-users",
        "repo": "taskflow-api",
        "path": "app/routers/tasks.py",
    }
    response = client.post("/api/analysis/explain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["filePath"] == "app/routers/tasks.py"
    assert "summary" in data
    assert len(data["howItWorks"]) > 0
    assert len(data["keyBuildingBlocks"]) > 0
    assert len(data["jargonTerms"]) > 0
    assert "rawCode" in data


def test_ask_question_success(client: TestClient):
    payload = {
        "owner": "fastapi-users",
        "repo": "taskflow-api",
        "path": "app/routers/tasks.py",
        "question": "What does create_task do?",
    }
    response = client.post("/api/analysis/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data["filePath"] == "app/routers/tasks.py"


def test_ai_unconfigured_error(client: TestClient):
    # Override gemma client with unconfigured instance
    app.dependency_overrides[get_gemma_client] = lambda: MockGemmaClient(configured=False)

    payload = {
        "owner": "pallets",
        "repo": "flask",
        "path": "app/routers/tasks.py",
    }
    response = client.post("/api/analysis/explain", json=payload)
    assert response.status_code == 503
    assert "GEMMA_API_KEY" in response.json()["detail"]

    # Also test ask endpoint
    ask_payload = {
        "owner": "pallets",
        "repo": "flask",
        "path": "app/routers/tasks.py",
        "question": "What is this?",
    }
    ask_response = client.post("/api/analysis/ask", json=ask_payload)
    assert ask_response.status_code == 503
    assert "GEMMA_API_KEY" in ask_response.json()["detail"]


def test_ask_empty_question_fails(client: TestClient):
    payload = {
        "owner": "fastapi-users",
        "repo": "taskflow-api",
        "path": "app/routers/tasks.py",
        "question": "   ",
    }
    response = client.post("/api/analysis/ask", json=payload)
    assert response.status_code == 400
