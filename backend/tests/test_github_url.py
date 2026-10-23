import pytest
from fastapi import HTTPException
from app.services.github_client import GitHubClient


def test_validate_identifier_valid():
    assert GitHubClient.validate_identifier("fastapi-users", "owner") == "fastapi-users"
    assert GitHubClient.validate_identifier("taskflow_api.v2", "repo") == "taskflow_api.v2"


def test_validate_identifier_invalid():
    with pytest.raises(HTTPException) as exc:
        GitHubClient.validate_identifier("invalid/owner", "owner")
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        GitHubClient.validate_identifier("repo;rm -rf /", "repo")
    assert exc.value.status_code == 400


def test_validate_file_path_valid():
    assert GitHubClient.validate_file_path("src/app.py") == "src/app.py"
    assert GitHubClient.validate_file_path("/src/nested/file.ts") == "src/nested/file.ts"
    assert GitHubClient.validate_file_path("src\\nested\\file.ts") == "src/nested/file.ts"


def test_validate_file_path_traversal():
    with pytest.raises(HTTPException) as exc:
        GitHubClient.validate_file_path("../../../etc/passwd")
    assert exc.value.status_code == 400
    assert "traversal" in exc.value.detail.lower()

    with pytest.raises(HTTPException) as exc:
        GitHubClient.validate_file_path("src/../../secret.py")
    assert exc.value.status_code == 400
