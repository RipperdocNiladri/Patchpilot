from functools import lru_cache
from fastapi import Depends
from app.config import Settings, get_settings
from app.services.analysis_service import AnalysisService
from app.services.contribution_service import ContributionService
from app.services.gemma_client import GemmaClient
from app.services.github_client import GitHubClient
from app.services.repository_service import RepositoryService


@lru_cache()
def get_github_client() -> GitHubClient:
    return GitHubClient()


@lru_cache()
def get_gemma_client() -> GemmaClient:
    return GemmaClient()


def get_repository_service(
    github: GitHubClient = Depends(get_github_client),
) -> RepositoryService:
    return RepositoryService(github_client=github)


def get_analysis_service(
    github: GitHubClient = Depends(get_github_client),
    gemma: GemmaClient = Depends(get_gemma_client),
) -> AnalysisService:
    return AnalysisService(
        github_client=github,
        gemma_client=gemma,
    )


def get_contribution_service(
    github: GitHubClient = Depends(get_github_client),
) -> ContributionService:
    return ContributionService(github_client=github)
