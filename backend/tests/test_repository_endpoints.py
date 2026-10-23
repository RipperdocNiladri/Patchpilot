from fastapi.testclient import TestClient


def test_get_repository_overview(client: TestClient):
    response = client.get("/api/repositories/fastapi-users/taskflow-api")
    assert response.status_code == 200
    data = response.json()
    assert data["owner"] == "fastapi-users"
    assert data["name"] == "taskflow-api"
    assert data["language"] == "Python"
    assert data["stars"] == 1420
    assert data["forks"] == 284
    assert data["accessibilityScore"] >= 60
    assert data["recommendedStartFile"] != ""


def test_get_repository_not_found(client: TestClient):
    response = client.get("/api/repositories/nonexistent/missing-repo")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_repository_tree(client: TestClient):
    response = client.get("/api/repositories/fastapi-users/taskflow-api/tree")
    assert response.status_code == 200
    tree = response.json()
    assert isinstance(tree, list)
    assert len(tree) > 0
    # Check folder / file hierarchy
    app_folder = next((item for item in tree if item["name"] == "app"), None)
    assert app_folder is not None
    assert app_folder["type"] == "folder"
    assert app_folder.get("children") is not None


def test_get_file_content(client: TestClient):
    response = client.get(
        "/api/repositories/fastapi-users/taskflow-api/files",
        params={"path": "app/routers/tasks.py"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["path"] == "app/routers/tasks.py"
    assert "APIRouter" in data["content"]
    assert data["language"] == "python"
    assert data["isBinary"] is False


def test_get_file_not_found(client: TestClient):
    response = client.get(
        "/api/repositories/fastapi-users/taskflow-api/files",
        params={"path": "nonexistent/file.py"},
    )
    assert response.status_code == 404
