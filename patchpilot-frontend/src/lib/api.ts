import {
  CodeExplanation,
  ContributionOpportunity,
  FileNode,
  RepositoryMeta,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface FileContentResponse {
  path: string;
  content: string;
  language?: string;
  size: number;
  isBinary: boolean;
  githubUrl: string;
}

export interface AskQuestionResponse {
  answer: string;
  evidence?: string;
  filePath?: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        detail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // response wasn't JSON
    }
    throw new ApiError(response.status, detail);
  }

  return response.json();
}

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  return request<{ status: string; service: string }>("/api/health");
}

export async function fetchRepositoryOverview(
  owner: string,
  repo: string,
  signal?: AbortSignal
): Promise<RepositoryMeta> {
  return request<RepositoryMeta>(`/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    signal,
  });
}

export async function fetchRepositoryTree(
  owner: string,
  repo: string,
  signal?: AbortSignal
): Promise<FileNode[]> {
  return request<FileNode[]>(`/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree`, {
    signal,
  });
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  signal?: AbortSignal
): Promise<FileContentResponse> {
  return request<FileContentResponse>(
    `/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/files?path=${encodeURIComponent(path)}`,
    { signal }
  );
}

export async function explainFile(
  owner: string,
  repo: string,
  path: string,
  signal?: AbortSignal
): Promise<CodeExplanation> {
  return request<CodeExplanation>("/api/analysis/explain", {
    method: "POST",
    body: JSON.stringify({ owner, repo, path }),
    signal,
  });
}

export async function askFileQuestion(
  owner: string,
  repo: string,
  path: string,
  question: string,
  signal?: AbortSignal
): Promise<AskQuestionResponse> {
  return request<AskQuestionResponse>("/api/analysis/ask", {
    method: "POST",
    body: JSON.stringify({ owner, repo, path, question }),
    signal,
  });
}

export async function fetchContributions(
  owner: string,
  repo: string,
  signal?: AbortSignal
): Promise<ContributionOpportunity[]> {
  return request<ContributionOpportunity[]>(
    `/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributions`,
    { signal }
  );
}
