import { describe, expect, it, vi, afterEach } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import {
  HttpError,
  parseGithubRepoInput,
  validateAskPayload,
  validateExplainPayload,
  validateFilePath,
  validateIdentifier,
} from "@/lib/validation";
import {
  ApiError,
  buildApiUrl,
  fetchContributions,
  fetchHealth,
  fetchRepositoryOverview,
} from "@/lib/api";

describe("Health Route & Validation Utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. GET /api/health returns 200 ok status", async () => {
    const response = await getHealth();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toContain("PatchPilot");
  });

  it("2. validateIdentifier and parseGithubRepoInput accept valid inputs and reject unsafe ones", () => {
    expect(validateIdentifier("fastapi-users", "owner")).toBe("fastapi-users");
    expect(validateIdentifier("taskflow_api.v2", "repo")).toBe("taskflow_api.v2");

    expect(
      parseGithubRepoInput("https://github.com/expressjs/express.git")
    ).toEqual({
      owner: "expressjs",
      repo: "express",
    });

    expect(parseGithubRepoInput("pallets/flask")).toEqual({
      owner: "pallets",
      repo: "flask",
    });

    expect(() => validateIdentifier("../etc", "owner")).toThrowError(HttpError);
    expect(() => validateIdentifier("bad/name", "repo")).toThrowError(HttpError);
    expect(() => validateIdentifier("..", "repo")).toThrowError(HttpError);
    expect(() => validateIdentifier("", "owner")).toThrowError(HttpError);
    expect(() => parseGithubRepoInput("invalid-single-segment")).toThrowError(
      HttpError
    );
  });

  it("5. validateFilePath normalizes valid paths and rejects path traversal / unsafe paths", () => {
    expect(validateFilePath("src/app/page.tsx")).toBe("src/app/page.tsx");
    expect(validateFilePath("/README.md")).toBe("README.md");
    expect(validateFilePath("app\\routers\\tasks.py")).toBe(
      "app/routers/tasks.py"
    );

    const unsafePaths = [
      "../secret.txt",
      "src/../../etc/passwd",
      "..\\windows\\system32",
      "%2e%2e/env",
      "src/file\0.ts",
      "",
      "   ",
    ];

    for (const unsafe of unsafePaths) {
      expect(() => validateFilePath(unsafe)).toThrowError(HttpError);
    }
  });

  it("11. validateExplainPayload and validateAskPayload reject invalid request payloads", () => {
    expect(() => validateExplainPayload(null)).toThrowError(HttpError);
    expect(() =>
      validateExplainPayload({ owner: "valid", repo: "valid", path: "../bad" })
    ).toThrowError(HttpError);

    expect(() =>
      validateAskPayload({
        owner: "valid",
        repo: "valid",
        path: "src/index.ts",
        question: "   ",
      })
    ).toThrowError(HttpError);

    const validAsk = validateAskPayload({
      owner: "fastapi-users",
      repo: "taskflow-api",
      path: "app/main.py",
      question: "What does this file initialize?",
    });
    expect(validAsk.question).toBe("What does this file initialize?");
  });

  it("12. Frontend API client constructs same-origin relative URLs and maps errors cleanly", async () => {
    expect(buildApiUrl("/api/health")).toBe("/api/health");
    expect(buildApiUrl("api/repositories/owner/repo")).toBe(
      "/api/repositories/owner/repo"
    );

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok", service: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const health = await fetchHealth();
    expect(health.status).toBe("ok");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Repository not found on GitHub." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      fetchRepositoryOverview("missing-owner", "missing-repo")
    ).rejects.toThrowError(ApiError);

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchContributions("fastapi-users", "taskflow-api");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "/api/contributions/fastapi-users/taskflow-api",
      expect.any(Object)
    );
  });
});
