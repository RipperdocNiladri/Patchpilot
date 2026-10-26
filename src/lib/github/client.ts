import { getServerConfig, ServerConfig } from "@/lib/env";
import {
  HttpError,
  validateFilePath,
  validateIdentifier,
} from "@/lib/validation";
import type { FileContentResponse } from "@/lib/api";

export interface GitHubRepoPayload {
  owner?: { login?: string };
  name?: string;
  full_name?: string;
  description?: string | null;
  private?: boolean;
  language?: string | null;
  license?: { spdx_id?: string; name?: string } | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  has_issues?: boolean;
  default_branch?: string;
  topics?: string[];
}

export interface GitHubReadmePayload {
  name: string;
  path: string;
  html_url: string;
  content: string;
}

export interface GitHubTreeItem {
  path?: string;
  mode?: string;
  type?: "blob" | "tree" | string;
  sha?: string;
  size?: number;
  url?: string;
}

export interface GitHubIssueItem {
  number?: number;
  title?: string;
  body?: string | null;
  html_url?: string;
  labels?: Array<{ name?: string } | string>;
  pull_request?: unknown;
}

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svgz",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".7z",
  ".rar",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".pyc",
  ".pyo",
  ".class",
  ".o",
  ".obj",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp3",
  ".mp4",
  ".wav",
]);

const LANGUAGE_MAP: Record<string, string> = {
  py: "python",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  html: "html",
  css: "css",
  sh: "bash",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  sql: "sql",
};

export class GitHubClient {
  private static readonly BASE_URL = "https://api.github.com";
  private readonly config: ServerConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(
    configOverrides?: Partial<ServerConfig>,
    fetchImpl: typeof fetch = globalThis.fetch
  ) {
    this.config = getServerConfig(configOverrides);
    this.fetchImpl = fetchImpl;
  }

  static validateIdentifier(name: string, fieldName = "name"): string {
    return validateIdentifier(name, fieldName);
  }

  static validateFilePath(path: string): string {
    return validateFilePath(path);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "PatchPilot-App/1.0",
    };
    const token = (
      this.config.GITHUB_TOKEN ||
      process.env.GITHUB_TOKEN ||
      ""
    ).trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleErrorResponse(
    response: Response,
    context: string
  ): Promise<void> {
    if (response.ok) return;

    if (response.status === 404) {
      throw new HttpError(404, `${context} not found on GitHub.`);
    }

    const bodyText = await response.text().catch(() => "");

    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining") ?? "0";
      if (remaining === "0") {
        throw new HttpError(
          429,
          "GitHub API rate limit exceeded (60 unauthenticated requests/hour). Add a GITHUB_TOKEN to .env.local for up to 5,000 requests/hour, or explore the built-in demo repository 'fastapi-users/taskflow-api'."
        );
      }
      throw new HttpError(
        403,
        `Access forbidden by GitHub API: ${bodyText.slice(0, 200)}`
      );
    }

    if (response.status >= 400) {
      throw new HttpError(
        502,
        `GitHub API returned error (${response.status}): ${bodyText.slice(0, 200)}`
      );
    }
  }

  private async fetchGitHub(url: string): Promise<Response> {
    try {
      return await this.fetchImpl(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.GITHUB_API_TIMEOUT_MS),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpError(504, `Unable to reach GitHub API: ${msg}`);
    }
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepoPayload> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");

    const url = `${GitHubClient.BASE_URL}/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}`;
    const response = await this.fetchGitHub(url);
    await this.handleErrorResponse(
      response,
      `Repository ${cleanOwner}/${cleanRepo}`
    );
    return (await response.json()) as GitHubRepoPayload;
  }

  async getReadme(
    owner: string,
    repo: string
  ): Promise<GitHubReadmePayload | null> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");

    const url = `${GitHubClient.BASE_URL}/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/readme`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.GITHUB_API_TIMEOUT_MS),
      });
    } catch {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      name?: string;
      path?: string;
      html_url?: string;
      content?: string;
      encoding?: string;
    };

    let decoded = "";
    if (data.encoding === "base64" && data.content) {
      try {
        decoded = Buffer.from(data.content, "base64").toString("utf-8");
      } catch {
        decoded = "";
      }
    }

    return {
      name: data.name || "README.md",
      path: data.path || "README.md",
      html_url:
        data.html_url || `https://github.com/${cleanOwner}/${cleanRepo}`,
      content: decoded,
    };
  }

  async getTree(
    owner: string,
    repo: string,
    branch?: string
  ): Promise<GitHubTreeItem[]> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");

    let targetBranch = branch;
    if (!targetBranch) {
      const repoData = await this.getRepository(cleanOwner, cleanRepo);
      targetBranch = repoData.default_branch || "main";
    }

    const url = `${GitHubClient.BASE_URL}/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`;
    const response = await this.fetchGitHub(url);

    if (response.status === 404) {
      return [];
    }

    await this.handleErrorResponse(
      response,
      `Tree for ${cleanOwner}/${cleanRepo}`
    );
    const data = (await response.json()) as { tree?: GitHubTreeItem[] };
    return Array.isArray(data.tree) ? data.tree : [];
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch?: string
  ): Promise<FileContentResponse> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");
    const cleanPath = validateFilePath(path);

    const encodedPath = cleanPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    let url = `${GitHubClient.BASE_URL}/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/contents/${encodedPath}`;
    if (branch) {
      url += `?ref=${encodeURIComponent(branch)}`;
    }

    const response = await this.fetchGitHub(url);
    await this.handleErrorResponse(response, `File '${cleanPath}'`);

    const data = (await response.json()) as
      | unknown[]
      | {
          size?: number;
          content?: string;
          encoding?: string;
          html_url?: string;
        };

    if (Array.isArray(data)) {
      throw new HttpError(
        400,
        `Path '${cleanPath}' is a directory, not a file.`
      );
    }

    const fileSize = data.size ?? 0;
    if (fileSize > this.config.MAX_FILE_BYTES) {
      throw new HttpError(
        413,
        `File exceeds maximum allowed size (${fileSize} bytes > ${this.config.MAX_FILE_BYTES} bytes limit).`
      );
    }

    const lowerPath = cleanPath.toLowerCase();
    let isBinary = Array.from(BINARY_EXTENSIONS).some((ext) =>
      lowerPath.endsWith(ext)
    );
    let contentStr = "";

    if (!isBinary && data.content) {
      if (data.encoding === "base64") {
        try {
          const rawBytes = Buffer.from(data.content, "base64");
          const sample = rawBytes.subarray(0, 1024);
          if (sample.includes(0)) {
            isBinary = true;
            contentStr = "[Binary file cannot be displayed]";
          } else {
            contentStr = rawBytes.toString("utf-8");
          }
        } catch {
          contentStr = "[Unable to decode file content]";
        }
      } else {
        contentStr = String(data.content ?? "");
      }
    }

    if (contentStr.length > this.config.MAX_FILE_CONTENT_CHARS) {
      contentStr =
        contentStr.slice(0, this.config.MAX_FILE_CONTENT_CHARS) +
        `\n\n... [Content truncated at ${this.config.MAX_FILE_CONTENT_CHARS} characters]`;
    }

    const ext = lowerPath.includes(".")
      ? lowerPath.split(".").pop() || ""
      : "";
    const language = LANGUAGE_MAP[ext] || ext || "text";

    return {
      path: cleanPath,
      content: contentStr,
      language,
      size: fileSize,
      isBinary,
      githubUrl:
        data.html_url ||
        `https://github.com/${cleanOwner}/${cleanRepo}/blob/main/${cleanPath}`,
    };
  }

  async getIssues(
    owner: string,
    repo: string,
    state = "open",
    perPage = 30
  ): Promise<GitHubIssueItem[]> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");

    const limit = Math.min(perPage, 50);
    const url = `${GitHubClient.BASE_URL}/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/issues?state=${encodeURIComponent(state)}&per_page=${limit}`;

    const response = await this.fetchGitHub(url);
    if (response.status === 404) {
      return [];
    }

    await this.handleErrorResponse(
      response,
      `Issues for ${cleanOwner}/${cleanRepo}`
    );

    const items = (await response.json()) as unknown;
    if (!Array.isArray(items)) {
      return [];
    }

    return (items as GitHubIssueItem[]).filter(
      (item) => item && typeof item === "object" && !("pull_request" in item)
    );
  }
}
