from typing import List
from fastapi import APIRouter, Depends
from app.dependencies import get_contribution_service
from app.schemas import ContributionOpportunity
from app.services.contribution_service import ContributionService

router = APIRouter(prefix="/api/contributions", tags=["contributions"])


@router.get("/{owner}/{repo}", response_model=List[ContributionOpportunity])
async def get_contributions(
    owner: str,
    repo: str,
    service: ContributionService = Depends(get_contribution_service),
) -> List[ContributionOpportunity]:
    """Retrieve candidate beginner contribution opportunities for the repository."""
    return await service.get_opportunities(owner, repo)
