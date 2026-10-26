"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("https://github.com/fastapi-users/taskflow-api");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = url.trim();
    if (!raw) {
      setError("Please enter a GitHub repository URL or owner/repo");
      return;
    }

    // Support both https://github.com/owner/repo and shorthand owner/repo
    const clean = raw.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/+$/, "");
    const parts = clean.split("/");

    if (parts.length >= 2 && parts[0] && parts[1]) {
      const owner = encodeURIComponent(parts[0]);
      const repo = encodeURIComponent(parts[1]);
      router.push(`/repository/${owner}/${repo}`);
    } else {
      setError("Please enter a valid GitHub URL (e.g. https://github.com/owner/repo or owner/repo)");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
      <div className="inline-block px-3 py-1 rounded-full bg-surface-container-high text-primary text-xs font-mono mb-6">
        AI-Powered Repository Onboarding for Beginners
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-on-surface mb-4">
        Understand any codebase.<br />
        <span className="text-primary-container">Find your first contribution.</span>
      </h1>
      <p className="text-on-surface-variant max-w-2xl mx-auto text-sm sm:text-base mb-8">
        PatchPilot turns unfamiliar open-source repositories into clear, guided learning paths. Explore architecture, read code in plain English, and discover verified beginner issues.
      </p>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto bg-surface-container-lowest p-2 rounded-2xl border border-surface-container shadow-xs flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder="https://github.com/owner/repository"
          className="flex-1 px-4 py-2 bg-transparent text-xs font-mono text-on-surface outline-none"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
        >
          Explore Repository →
        </button>
      </form>
      {error && <div className="mt-2 text-xs text-error font-medium">{error}</div>}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-on-surface-variant">
        <span className="font-mono text-outline">Try an example:</span>
        {["fastapi-users/taskflow-api", "expressjs/express", "pallets/flask"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setUrl(`https://github.com/${r}`);
              setError("");
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-container font-mono text-xs hover:text-primary transition-colors hover:bg-surface-container-high"
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
