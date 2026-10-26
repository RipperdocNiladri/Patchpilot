import { describe, expect, it, vi, afterEach } from "vitest";
import { GET as getContributions } from "@/app/api/contributions/[owner]/[repo]/route";

describe("Contribution Discovery Route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("10. GET /api/contributions/[owner]/[repo] discovers real GitHub issues and TODO comments", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/repos/acme/project/issues")) {
        return new Response(
          JSON.stringify([
            {
              number: 12,
              title: "Update README installation guide for Windows",
              body: "Please update docs/setup.md to clarify Node.js 20+ requirement.",
              html_url: "https://github.com/acme/project/issues/12",
              labels: [{ name: "good first issue" }, { name: "documentation" }],
            },
            {
              number: 13,
              title: "Bump dependencies PR",
              pull_request: { url: "https://api.github.com/repos/acme/project/pulls/13" },
            },
          ]),
          { status: 200 }
        );
      }
      if (url.endsWith("/repos/acme/project")) {
        return new Response(JSON.stringify({ default_branch: "main" }), {
          status: 200,
        });
      }
      if (url.includes("/git/trees/main")) {
        return new Response(
          JSON.stringify({
            tree: [{ path: "src/utils.ts", type: "blob", size: 120 }],
          }),
          { status: 200 }
        );
      }
      if (url.includes("/contents/src/utils.ts")) {
        const content = [
          "export function formatName(name: string) {",
          "  // TODO: Handle empty and whitespace-only strings gracefully",
          "  return name.trim();",
          "}",
        ].join("\n");
        return new Response(
          JSON.stringify({
            size: content.length,
            encoding: "base64",
            content: Buffer.from(content).toString("base64"),
          }),
          { status: 200 }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const res = await getContributions(
      new Request("http://localhost:3000/api/contributions/acme/project"),
      { params: Promise.resolve({ owner: "acme", repo: "project" }) }
    );

    expect(res.status).toBe(200);
    const opps = await res.json();
    // Should include issue #12 (excluding PR #13) and the TODO in src/utils.ts
    expect(opps).toHaveLength(2);
    expect(opps[0].id).toBe("github-issue-12");
    expect(opps[0].difficulty).toBe("beginner");
    expect(opps[0].type).toBe("documentation");
    expect(opps[0].targetFiles[0].path).toBe("docs/setup.md");

    expect(opps[1].id).toBe("todo-src-utils.ts-L2");
    expect(opps[1].sourceBadge.label).toBe("Found in repo");
    expect(opps[1].targetFiles[0]).toEqual({
      path: "src/utils.ts",
      lines: "Line 2",
    });
  });
});
