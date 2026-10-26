import { describe, expect, it, vi, afterEach } from "vitest";
import { GET as getRepoOverview } from "@/app/api/repositories/[owner]/[repo]/route";
import { GET as getRepoTree } from "@/app/api/repositories/[owner]/[repo]/tree/route";
import { GET as getRepoFile } from "@/app/api/repositories/[owner]/[repo]/files/route";

describe("Repository Metadata, Tree & File Content Routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("3. GET /api/repositories/[owner]/[repo] returns demo repository metadata and mocked live GitHub metadata", async () => {
    // Built-in demo repo works without external calls
    const demoRes = await getRepoOverview(
      new Request("http://localhost:3000/api/repositories/fastapi-users/taskflow-api"),
      { params: Promise.resolve({ owner: "fastapi-users", repo: "taskflow-api" }) }
    );
    expect(demoRes.status).toBe(200);
    const demoBody = await demoRes.json();
    expect(demoBody.fullName).toBe("fastapi-users/taskflow-api");
    expect(demoBody.recommendedStartFile).toBe("app/routers/tasks.py");

    // Mocked live GitHub repository
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/widget-service")) {
        return new Response(
          JSON.stringify({
            owner: { login: "acme" },
            name: "widget-service",
            full_name: "acme/widget-service",
            description: "Widget microservice",
            private: false,
            language: "TypeScript",
            license: { spdx_id: "Apache-2.0" },
            stargazers_count: 350,
            forks_count: 42,
            open_issues_count: 5,
            has_issues: true,
            default_branch: "main",
            topics: ["typescript", "api"],
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/repos/acme/widget-service/readme")) {
        return new Response(
          JSON.stringify({
            name: "README.md",
            path: "README.md",
            content: Buffer.from("# Widget Service\nWelcome").toString("base64"),
            encoding: "base64",
          }),
          { status: 200 }
        );
      }
      if (url.includes("/git/trees/main")) {
        return new Response(
          JSON.stringify({
            tree: [
              { path: "src", type: "tree" },
              { path: "src/index.ts", type: "blob", size: 240 },
              { path: "README.md", type: "blob", size: 120 },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const liveRes = await getRepoOverview(
      new Request("http://localhost:3000/api/repositories/acme/widget-service"),
      { params: Promise.resolve({ owner: "acme", repo: "widget-service" }) }
    );
    expect(liveRes.status).toBe(200);
    const liveBody = await liveRes.json();
    expect(liveBody.fullName).toBe("acme/widget-service");
    expect(liveBody.language).toBe("TypeScript");
    expect(liveBody.license).toBe("Apache-2.0");
    expect(liveBody.recommendedStartFile).toBe("src/index.ts");
    expect(liveBody.accessibilityScore).toBe(98);
  });

  it("4. GET /api/repositories/[owner]/[repo]/tree and /files return nested tree and decoded file contents", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/widget-service")) {
        return new Response(JSON.stringify({ default_branch: "main" }), {
          status: 200,
        });
      }
      if (url.includes("/git/trees/main")) {
        return new Response(
          JSON.stringify({
            tree: [
              { path: "README.md", type: "blob", size: 50 },
              { path: "src", type: "tree" },
              { path: "src/index.ts", type: "blob", size: 120 },
              { path: "node_modules/pkg/index.js", type: "blob", size: 99 },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes("/contents/src/index.ts")) {
        const source = "export const hello = () => 'world';\n";
        return new Response(
          JSON.stringify({
            size: source.length,
            encoding: "base64",
            content: Buffer.from(source).toString("base64"),
            html_url: "https://github.com/acme/widget-service/blob/main/src/index.ts",
          }),
          { status: 200 }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const treeRes = await getRepoTree(
      new Request("http://localhost:3000/api/repositories/acme/widget-service/tree"),
      { params: Promise.resolve({ owner: "acme", repo: "widget-service" }) }
    );
    expect(treeRes.status).toBe(200);
    const tree = await treeRes.json();
    // Folders sorted first, node_modules filtered out
    expect(tree[0].name).toBe("src");
    expect(tree[0].type).toBe("folder");
    expect(tree[0].children[0].path).toBe("src/index.ts");
    expect(tree[0].children[0].badge).toBe("Recommended Start");

    const fileRes = await getRepoFile(
      new Request(
        "http://localhost:3000/api/repositories/acme/widget-service/files?path=src/index.ts"
      ),
      { params: Promise.resolve({ owner: "acme", repo: "widget-service" }) }
    );
    expect(fileRes.status).toBe(200);
    const fileData = await fileRes.json();
    expect(fileData.path).toBe("src/index.ts");
    expect(fileData.language).toBe("typescript");
    expect(fileData.content).toContain("export const hello");
  });

  it("5 & 6. Rejects unsafe file paths (400), handles missing repos (404), and handles GitHub rate limits (429)", async () => {
    // Unsafe path traversal in /files?path=
    const traversalRes = await getRepoFile(
      new Request(
        "http://localhost:3000/api/repositories/acme/widget-service/files?path=../../.env"
      ),
      { params: Promise.resolve({ owner: "acme", repo: "widget-service" }) }
    );
    expect(traversalRes.status).toBe(400);
    const traversalBody = await traversalRes.json();
    expect(traversalBody.detail).toContain("path traversal");

    // 404 Missing repository on GitHub
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Not Found" }), { status: 404 })
    );
    const notFoundRes = await getRepoOverview(
      new Request("http://localhost:3000/api/repositories/nobody/nonexistent"),
      { params: Promise.resolve({ owner: "nobody", repo: "nonexistent" }) }
    );
    expect(notFoundRes.status).toBe(404);

    // 403 Rate limit exceeded -> mapped to 429
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("rate limit exceeded", {
        status: 403,
        headers: { "x-ratelimit-remaining": "0" },
      })
    );
    const rateLimitRes = await getRepoOverview(
      new Request("http://localhost:3000/api/repositories/acme/rate-limited"),
      { params: Promise.resolve({ owner: "acme", repo: "rate-limited" }) }
    );
    expect(rateLimitRes.status).toBe(429);
    const rateLimitBody = await rateLimitRes.json();
    expect(rateLimitBody.detail).toContain("rate limit exceeded");
  });
});
