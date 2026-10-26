import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
  }
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ detail: error.detail }, { status: error.status });
  }
  const message =
    error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ detail: message }, { status: 500 });
}

const IDENTIFIER_REGEX = /^[a-zA-Z0-9_.-]+$/;

/**
 * Validate repository owner or repository name to prevent SSRF and injection.
 */
export function validateIdentifier(name: string, fieldName = "name"): string {
  const clean = (name ?? "").trim();
  if (
    !clean ||
    clean === "." ||
    clean === ".." ||
    clean.length > 100 ||
    !IDENTIFIER_REGEX.test(clean)
  ) {
    throw new HttpError(
      400,
      `Invalid ${fieldName}: '${name}'. Must contain only alphanumeric characters, dashes, underscores, and dots.`
    );
  }
  return clean;
}

/**
 * Validate and normalize a file path to prevent directory traversal.
 */
export function validateFilePath(rawPath: string): string {
  if (typeof rawPath !== "string") {
    throw new HttpError(400, "File path is required.");
  }

  if (rawPath.includes("\0")) {
    throw new HttpError(400, "Invalid file path: path traversal detected.");
  }

  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    // Keep original if malformed URI encoding
  }

  if (decoded.includes("\0")) {
    throw new HttpError(400, "Invalid file path: path traversal detected.");
  }

  const normalized = decoded.trim().replace(/\\/g, "/");
  const clean = normalized.replace(/^\/+/, "").replace(/\/+$/, "");

  if (!clean) {
    throw new HttpError(400, "File path cannot be empty.");
  }

  const parts = clean.split("/");
  if (
    parts.includes("..") ||
    parts.some((p) => p.startsWith("..") || p === "." || p.length === 0)
  ) {
    throw new HttpError(400, "Invalid file path: path traversal detected.");
  }

  return clean;
}

/**
 * Parse a GitHub repository URL or owner/repo shorthand into validated { owner, repo }.
 */
export function parseGithubRepoInput(input: string): {
  owner: string;
  repo: string;
} {
  const raw = (input ?? "").trim();
  if (!raw) {
    throw new HttpError(400, "Repository URL or owner/repo is required.");
  }

  const withoutProtocol = raw
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");

  const parts = withoutProtocol.split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new HttpError(
      400,
      "Invalid GitHub repository format. Expected 'https://github.com/owner/repo' or 'owner/repo'."
    );
  }

  const owner = validateIdentifier(parts[0], "owner");
  const repo = validateIdentifier(parts[1], "repo");
  return { owner, repo };
}

export interface ExplainRequestPayload {
  owner: string;
  repo: string;
  path: string;
}

export interface AskRequestPayload {
  owner: string;
  repo: string;
  path: string;
  question: string;
}

export function validateExplainPayload(body: unknown): ExplainRequestPayload {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON request body.");
  }
  const obj = body as Record<string, unknown>;
  const owner = validateIdentifier(String(obj.owner ?? ""), "owner");
  const repo = validateIdentifier(String(obj.repo ?? ""), "repo");
  const path = validateFilePath(String(obj.path ?? ""));
  return { owner, repo, path };
}

export function validateAskPayload(body: unknown): AskRequestPayload {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON request body.");
  }
  const obj = body as Record<string, unknown>;
  const owner = validateIdentifier(String(obj.owner ?? ""), "owner");
  const repo = validateIdentifier(String(obj.repo ?? ""), "repo");
  const path = validateFilePath(String(obj.path ?? ""));
  const question = typeof obj.question === "string" ? obj.question.trim() : "";

  if (!question) {
    throw new HttpError(400, "Question cannot be empty.");
  }
  if (question.length > 1000) {
    throw new HttpError(
      400,
      "Question exceeds maximum length of 1000 characters."
    );
  }

  return { owner, repo, path, question };
}
