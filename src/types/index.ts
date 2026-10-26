export interface RepositoryMeta {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  isPublic: boolean;
  language: string;
  license: string;
  stars: number;
  forks: number;
  openIssuesCount: number;
  defaultBranch: string;
  totalFiles: number;
  coreModulesCount: number;
  accessibilityScore: number;
  estimatedOnboardingMinutes: number;
  recommendedStartFile: string;
  readme?: string;
  topics?: string[];
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  badge?: string;
  children?: FileNode[];
  size?: number;
}

export interface CodeExplanation {
  filePath: string;
  linesRange: string;
  rawCode: string;
  summary: string;
  focusLines: number[];
  howItWorks: Array<{
    step: number;
    title: string;
    description: string;
    lineRef: string;
  }>;
  keyBuildingBlocks: Array<{
    name: string;
    description: string;
    type: string;
  }>;
  jargonTerms: Array<{
    term: string;
    definition: string;
  }>;
  evidenceReferences?: string[];
}

export interface ContributionOpportunity {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate";
  type: "documentation" | "unit-test" | "code-fix";
  estimatedMinutes: number;
  sourceBadge: {
    label: string;
  };
  whyItMatters: string;
  targetFiles: Array<{
    path: string;
    lines: string;
  }>;
  steps: Array<{
    stepNumber: number;
    instruction: string;
    command?: string;
  }>;
  maintainerTip: string;
  safetyRating: number;
  suggestedBranchName: string;
  issueUrl?: string;
}
