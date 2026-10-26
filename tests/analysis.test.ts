import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST as postExplain } from "@/app/api/analysis/explain/route";
import { POST as postAsk } from "@/app/api/analysis/ask/route";

describe("AI Code Explanation & Q&A Routes", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("7. POST /api/analysis/explain returns structured code explanation with mocked Gemma response", async () => {
    process.env.GEMMA_API_KEY = "test-gemma-key";
    process.env.GEMMA_MODEL = "gemma-4-26b-a4b-it";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("api.github.com/repos/acme/app/contents/src/server.ts")) {
        const code = "import express from 'express';\nconst app = express();\napp.listen(3000);";
        return new Response(
          JSON.stringify({
            size: code.length,
            encoding: "base64",
            content: Buffer.from(code).toString("base64"),
          }),
          { status: 200 }
        );
      }
      if (url.includes("generativelanguage.googleapis.com")) {
        const aiJson = {
          summary: "Initializes an Express HTTP server and listens on port 3000.",
          focusLines: [1, 2, 3],
          howItWorks: [
            {
              step: 1,
              title: "Imports Express",
              description: "Loads the Express web framework.",
              lineRef: "Line 1",
            },
          ],
          keyBuildingBlocks: [
            {
              name: "app.listen(3000)",
              description: "Starts the HTTP server on port 3000.",
              type: "Function",
            },
          ],
          jargonTerms: [
            {
              term: "Port",
              definition: "A numbered communication endpoint for network traffic.",
            },
          ],
          evidenceReferences: ["Line 3: app.listen(3000)"],
        };
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: "```json\n" + JSON.stringify(aiJson) + "\n```",
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const req = new Request("http://localhost:3000/api/analysis/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: "acme",
        repo: "app",
        path: "src/server.ts",
      }),
    });

    const res = await postExplain(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.filePath).toBe("src/server.ts");
    expect(body.summary).toContain("Express HTTP server");
    expect(body.howItWorks).toHaveLength(1);
    expect(body.keyBuildingBlocks[0].name).toBe("app.listen(3000)");
  });

  it("8. POST /api/analysis/ask returns grounded answer with mocked Gemma response", async () => {
    process.env.GEMMA_API_KEY = "test-gemma-key";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("api.github.com/repos/acme/app/contents/src/server.ts")) {
        const code = "const PORT = 3000;\napp.listen(PORT);";
        return new Response(
          JSON.stringify({
            size: code.length,
            encoding: "base64",
            content: Buffer.from(code).toString("base64"),
          }),
          { status: 200 }
        );
      }
      if (url.includes("generativelanguage.googleapis.com")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        answer: "The server listens on port 3000.",
                        evidence: "Line 1: const PORT = 3000;",
                        filePath: "src/server.ts",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const req = new Request("http://localhost:3000/api/analysis/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: "acme",
        repo: "app",
        path: "src/server.ts",
        question: "Which port does the server use?",
      }),
    });

    const res = await postAsk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBe("The server listens on port 3000.");
    expect(body.evidence).toContain("const PORT = 3000");
  });

  it("9. Returns 503 Service Unavailable with clear message when GEMMA_API_KEY is missing on non-demo repo", async () => {
    delete process.env.GEMMA_API_KEY;

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          size: 20,
          encoding: "base64",
          content: Buffer.from("console.log('hi');").toString("base64"),
        }),
        { status: 200 }
      )
    );

    const req = new Request("http://localhost:3000/api/analysis/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: "acme",
        repo: "app",
        path: "src/index.ts",
      }),
    });

    const res = await postExplain(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.detail).toContain("Gemma AI is not configured");
  });

  it("11. Rejects invalid JSON or empty question in /api/analysis/ask with 400", async () => {
    const badJsonReq = new Request("http://localhost:3000/api/analysis/ask", {
      method: "POST",
      body: "{not-valid-json",
    });
    const badJsonRes = await postAsk(badJsonReq);
    expect(badJsonRes.status).toBe(400);

    const emptyQReq = new Request("http://localhost:3000/api/analysis/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: "acme",
        repo: "app",
        path: "src/index.ts",
        question: "   ",
      }),
    });
    const emptyQRes = await postAsk(emptyQReq);
    expect(emptyQRes.status).toBe(400);
  });
});
