from fastapi import APIRouter, Depends
from app.dependencies import get_analysis_service
from app.schemas import AskQuestionRequest, AskQuestionResponse, CodeExplanation, ExplainRequest
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/explain", response_model=CodeExplanation)
async def explain_code(
    payload: ExplainRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> CodeExplanation:
    """Generate a beginner-friendly code explanation using Gemma."""
    return await service.explain_file(payload.owner, payload.repo, payload.path)


@router.post("/ask", response_model=AskQuestionResponse)
async def ask_question(
    payload: AskQuestionRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> AskQuestionResponse:
    """Answer a beginner's question about a specific file using Gemma."""
    return await service.ask_question(
        payload.owner, payload.repo, payload.path, payload.question
    )
