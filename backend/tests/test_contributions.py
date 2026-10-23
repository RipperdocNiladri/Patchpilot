from fastapi.testclient import TestClient


def test_get_contributions(client: TestClient):
    response = client.get("/api/repositories/fastapi-users/taskflow-api/contributions")
    assert response.status_code == 200
    opps = response.json()
    assert isinstance(opps, list)
    assert len(opps) >= 2

    # Verify fields on opportunities
    first = opps[0]
    assert "id" in first
    assert "title" in first
    assert "difficulty" in first
    assert first["difficulty"] in ("beginner", "intermediate")
    assert "type" in first
    assert "sourceBadge" in first
    assert "whyItMatters" in first
    assert "steps" in first
    assert len(first["steps"]) > 0
    assert "maintainerTip" in first
    assert "suggestedBranchName" in first


def test_contributions_router_alias(client: TestClient):
    response = client.get("/api/contributions/fastapi-users/taskflow-api")
    assert response.status_code == 200
    opps = response.json()
    assert isinstance(opps, list)
    assert len(opps) >= 2


def test_contributions_todos_detected(client: TestClient):
    response = client.get("/api/repositories/pallets/flask/contributions")
    opps = response.json()
    # Check that in-repo TODO in app/main.py was detected
    todo_opp = next((o for o in opps if o["sourceBadge"]["label"] == "Found in repo"), None)
    assert todo_opp is not None
    assert "TODO" in todo_opp["title"]
    assert "app/main.py" in todo_opp["targetFiles"][0]["path"]
