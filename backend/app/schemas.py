from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "patchpilot-backend"


class RepositoryMeta(BaseModel):
    owner: str
    name: str
    fullName: str
    description: str = ""
    isPublic: bool = True
    language: str = "Unknown"
    license: str = "None"
    stars: int = 0
    forks: int = 0
    openIssuesCount: int = 0
    defaultBranch: str = "main"
    totalFiles: int = 0
    coreModulesCount: int = 0
    accessibilityScore: int = 80
    estimatedOnboardingMinutes: int = 20
    recommendedStartFile: str = "README.md"
    readme: Optional[str] = None
    topics: List[str] = Field(default_factory=list)


class FileNode(BaseModel):
    name: str
    path: str
    type: str  # "file" or "folder"
    badge: Optional[str] = None
    children: Optional[List[FileNode]] = None
    size: Optional[int] = None


class FileContentResponse(BaseModel):
    path: str
    content: str
    language: Optional[str] = None
    size: int
    isBinary: bool = False
    githubUrl: str


class ExplainRequest(BaseModel):
    owner: str
    repo: str
    path: str


class CodeExplanationHowItWorks(BaseModel):
    step: int
    title: str
    description: str
    lineRef: str


class CodeExplanationBuildingBlock(BaseModel):
    name: str
    description: str
    type: str


class CodeExplanationJargon(BaseModel):
    term: str
    definition: str


class CodeExplanation(BaseModel):
    filePath: str
    linesRange: str
    rawCode: str
    summary: str
    focusLines: List[int] = Field(default_factory=list)
    howItWorks: List[CodeExplanationHowItWorks] = Field(default_factory=list)
    keyBuildingBlocks: List[CodeExplanationBuildingBlock] = Field(default_factory=list)
    jargonTerms: List[CodeExplanationJargon] = Field(default_factory=list)
    evidenceReferences: List[str] = Field(default_factory=list)


class AskQuestionRequest(BaseModel):
    owner: str
    repo: str
    path: str
    question: str


class AskQuestionResponse(BaseModel):
    answer: str
    evidence: Optional[str] = None
    filePath: Optional[str] = None


class ContributionOpportunityTargetFile(BaseModel):
    path: str
    lines: str


class ContributionOpportunityStep(BaseModel):
    stepNumber: int
    instruction: str
    command: Optional[str] = None


class ContributionOpportunityBadge(BaseModel):
    label: str


class ContributionOpportunity(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str  # "beginner" | "intermediate"
    type: str  # "documentation" | "unit-test" | "code-fix"
    estimatedMinutes: int
    sourceBadge: ContributionOpportunityBadge
    whyItMatters: str
    targetFiles: List[ContributionOpportunityTargetFile] = Field(default_factory=list)
    steps: List[ContributionOpportunityStep] = Field(default_factory=list)
    maintainerTip: str
    safetyRating: int = 90
    suggestedBranchName: str
    issueUrl: Optional[str] = None


class ContributionListResponse(BaseModel):
    opportunities: List[ContributionOpportunity]
    total: int
    repository: str
