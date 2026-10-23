import re
from typing import Optional
from fastapi import HTTPException, status
from app.schemas import (
    AskQuestionResponse,
    CodeExplanation,
    CodeExplanationBuildingBlock,
    CodeExplanationHowItWorks,
    CodeExplanationJargon,
)
from app.services.demo_data import (
    DEMO_CODE_EXPLANATION,
    DEMO_FILES,
    is_demo_repo,
)
from app.services.gemma_client import GemmaClient
from app.services.github_client import GitHubClient
from app.services.prompts import ASK_QUESTION_PROMPT, EXPLAIN_CODE_PROMPT


class AnalysisService:
    """Service to handle AI-powered code explanations and question answering."""

    def __init__(
        self,
        github_client: Optional[GitHubClient] = None,
        gemma_client: Optional[GemmaClient] = None,
    ):
        self.github = github_client or GitHubClient()
        self.gemma = gemma_client or GemmaClient()

    async def explain_file(self, owner: str, repo: str, path: str) -> CodeExplanation:
        clean_path = path.replace("\\", "/").strip("/")

        # If this is the demo repository and AI is not configured, return demo explanation
        if is_demo_repo(owner, repo) and not self.gemma.is_configured:
            if clean_path in DEMO_FILES and clean_path == "app/routers/tasks.py":
                return DEMO_CODE_EXPLANATION

        # Retrieve file content
        if is_demo_repo(owner, repo) and clean_path in DEMO_FILES:
            raw_code = DEMO_FILES[clean_path].content
            is_binary = False
        else:
            file_data = await self.github.get_file_content(owner, repo, path)
            raw_code = file_data["content"]
            is_binary = file_data.get("isBinary", False)

        if is_binary:
            return CodeExplanation(
                filePath=path,
                linesRange="N/A",
                rawCode="[Binary file: cannot be analyzed or displayed]",
                summary="This is a binary file (such as an image, executable, or compiled asset) and cannot be explained as source code.",
                focusLines=[],
                howItWorks=[],
                keyBuildingBlocks=[],
                jargonTerms=[],
                evidenceReferences=["Binary file detected by extension or byte header"],
            )

        total_lines = len(raw_code.splitlines())
        lines_range = f"lines 1-{total_lines}" if total_lines > 0 else "empty file"

        # Check if Gemma AI is configured
        if not self.gemma.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemma AI is not configured. Please configure GEMMA_API_KEY in backend/.env to enable AI code explanations.",
            )

        # Prepare truncated code sample if file is large for prompt safety
        max_prompt_chars = 12_000
        prompt_code = raw_code[:max_prompt_chars]
        if len(raw_code) > max_prompt_chars:
            prompt_code += "\n... [Remaining lines truncated for model prompt context]"

        prompt = EXPLAIN_CODE_PROMPT.format(
            owner=owner,
            repo=repo,
            path=path,
            code=prompt_code,
        )

        data = await self.gemma.generate_json(prompt)

        # Parse and sanitize response data
        summary = str(data.get("summary") or f"Source file {path} in {owner}/{repo}.")
        focus_lines = [int(n) for n in data.get("focusLines", []) if isinstance(n, (int, float))]

        how_it_works = []
        for item in data.get("howItWorks", []):
            if isinstance(item, dict):
                how_it_works.append(
                    CodeExplanationHowItWorks(
                        step=int(item.get("step", len(how_it_works) + 1)),
                        title=str(item.get("title", "Step")),
                        description=str(item.get("description", "")),
                        lineRef=str(item.get("lineRef", "")),
                    )
                )

        key_blocks = []
        for item in data.get("keyBuildingBlocks", []):
            if isinstance(item, dict):
                key_blocks.append(
                    CodeExplanationBuildingBlock(
                        name=str(item.get("name", "")),
                        description=str(item.get("description", "")),
                        type=str(item.get("type", "Component")),
                    )
                )

        jargon = []
        for item in data.get("jargonTerms", []):
            if isinstance(item, dict):
                jargon.append(
                    CodeExplanationJargon(
                        term=str(item.get("term", "")),
                        definition=str(item.get("definition", "")),
                    )
                )

        evidence = [str(e) for e in data.get("evidenceReferences", [])]

        return CodeExplanation(
            filePath=path,
            linesRange=lines_range,
            rawCode=raw_code,
            summary=summary,
            focusLines=focus_lines,
            howItWorks=how_it_works,
            keyBuildingBlocks=key_blocks,
            jargonTerms=jargon,
            evidenceReferences=evidence,
        )

    async def ask_question(
        self, owner: str, repo: str, path: str, question: str
    ) -> AskQuestionResponse:
        clean_question = (question or "").strip()
        if not clean_question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question cannot be empty.",
            )

        clean_path = path.replace("\\", "/").strip("/")

        # Check demo repo fallback if AI is not configured
        if is_demo_repo(owner, repo) and not self.gemma.is_configured:
            return AskQuestionResponse(
                answer=f"PatchPilot Analysis (Demo Mode): In {clean_path}, async functions allow FastAPI to process other incoming HTTP requests concurrently while worker tasks are queued in the background.",
                evidence="Line 8: async def create_task(payload: TaskCreate)",
                filePath=path,
            )

        # Retrieve real file content from GitHub
        if is_demo_repo(owner, repo) and clean_path in DEMO_FILES:
            raw_code = DEMO_FILES[clean_path].content
            is_binary = False
        else:
            file_data = await self.github.get_file_content(owner, repo, path)
            raw_code = file_data["content"]
            is_binary = file_data.get("isBinary", False)

        if is_binary:
            return AskQuestionResponse(
                answer="This file is binary and cannot be inspected for code questions.",
                evidence="Binary file",
                filePath=path,
            )

        if not self.gemma.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemma AI is not configured. Please configure GEMMA_API_KEY in backend/.env to ask questions about code.",
            )

        max_prompt_chars = 12_000
        prompt_code = raw_code[:max_prompt_chars]

        prompt = ASK_QUESTION_PROMPT.format(
            owner=owner,
            repo=repo,
            path=path,
            code=prompt_code,
            question=clean_question,
        )

        data = await self.gemma.generate_json(prompt)
        return AskQuestionResponse(
            answer=str(data.get("answer") or "No answer could be generated from the file context."),
            evidence=str(data.get("evidence") or "") if data.get("evidence") else None,
            filePath=path,
        )
