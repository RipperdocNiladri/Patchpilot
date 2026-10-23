from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.dependencies import get_contribution_service, get_repository_service
from app.schemas import ContributionOpportunity, FileContentResponse, FileNode, RepositoryMeta
from app.services.contribution_service import ContributionService
from app.services.repository_service import RepositoryService

router = APIRouter(prefix="/api/repositories", tags=["repositories"])


@router.get("/{owner}/{repo}", response_model=RepositoryMeta)
async def get_repository_overview(
    owner: str,
    repo: str,
    service: RepositoryService = Depends(get_repository_service),
) -> RepositoryMeta:
    """Retrieve repository metadata, README summary material, and onboarding stats."""
    return await service.get_overview(owner, repo)


@router.get("/{owner}/{repo}/tree", response_model=List[FileNode])
async def get_repository_tree(
    owner: str,
    repo: str,
    service: RepositoryService = Depends(get_repository_service),
) -> List[FileNode]:
    """Retrieve structured hierarchical file tree for the repository."""
    return await service.get_tree(owner, repo)


@router.get("/{owner}/{repo}/files", response_model=FileContentResponse)
async def get_repository_file(
    owner: str,
    repo: str,
    path: str = Query(..., description="Relative file path inside the repository"),
    service: RepositoryService = Depends(get_repository_service),
) -> FileContentResponse:
    """Retrieve contents and metadata for a specific file in the repository."""
    return await service.get_file_content(owner, repo, path)


@router.get("/{owner}/{repo}/contributions", response_model=List[ContributionOpportunity])
async def get_repository_contributions(
    owner: str,
    repo: str,
    service: ContributionService = Depends(get_contribution_service),
) -> List[ContributionOpportunity]:
    """Retrieve candidate beginner contribution opportunities for the repository."""
    return await service.get_opportunities(owner, repo)
