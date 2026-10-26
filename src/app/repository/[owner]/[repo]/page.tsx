"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { RepositoryMeta, FileNode } from "@/types";
import { fetchRepositoryOverview, fetchRepositoryTree, ApiError } from "@/lib/api";

export default function RepoOverviewPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = use(params);

  const [meta, setMeta] = useState<RepositoryMeta | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaData, treeData] = await Promise.all([
        fetchRepositoryOverview(owner, repo),
        fetchRepositoryTree(owner, repo).catch(() => []),
      ]);
      setMeta(metaData);
      setTree(treeData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message || "Failed to connect to PatchPilot backend.");
      } else {
        setError("An unknown error occurred while loading repository details.");
      }
    } finally {
      setLoading(false);
    }
  }, [owner, repo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 border-3 border-primary-container border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-mono text-on-surface-variant">
          Analyzing repository <span className="font-bold text-on-surface">{owner}/{repo}</span>...
        </div>
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-error-container/30 border border-error/30 rounded-2xl p-6 text-center">
          <div className="text-error font-bold text-sm mb-2">Unable to load repository data</div>
          <p className="text-xs text-on-surface-variant mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary transition-colors"
            >
              Retry Request
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-surface-container text-on-surface text-xs font-semibold rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Extract top-level modules from tree
  const topLevelNodes = tree.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header card */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-on-surface">
              <span className="text-on-surface-variant font-mono">{owner}</span>
              <span className="text-outline-variant font-mono">/</span>
              <span className="text-primary font-mono">{repo}</span>
              {meta.isPublic && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-surface-container text-outline">
                  Public
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
              {meta.description || "No description provided for this repository."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono px-3 py-1.5 rounded-xl border border-surface-container hover:bg-surface-container-low text-on-surface flex items-center gap-1.5 transition-colors"
            >
              <span>GitHub</span> ↗
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface flex items-center gap-1.5">
            <span>⭐</span> {meta.stars.toLocaleString()} stars
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface flex items-center gap-1.5">
            <span>🔱</span> {meta.forks.toLocaleString()} forks
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface flex items-center gap-1.5">
            <span>🐛</span> {meta.openIssuesCount.toLocaleString()} open issues
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface flex items-center gap-1.5">
            <span>💻</span> {meta.language}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface flex items-center gap-1.5">
            <span>📄</span> {meta.license}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-secondary-container text-on-secondary-container font-semibold flex items-center gap-1.5">
            <span>🎯</span> Score: {meta.accessibilityScore}/100
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repository Blueprint & Modules */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface">Repository Blueprint & Modules</h2>
            <span className="text-[11px] font-mono text-outline">
              {meta.totalFiles} files detected
            </span>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl font-mono text-xs space-y-1.5 max-h-72 overflow-y-auto">
            {topLevelNodes.length > 0 ? (
              topLevelNodes.map((node) => {
                const isRecommended = node.path === meta.recommendedStartFile;
                return (
                  <div key={node.path} className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2">
                      <span>{node.type === "folder" ? "📁" : "📄"}</span>
                      <span className={isRecommended ? "text-primary font-semibold" : "text-on-surface"}>
                        {node.name}
                      </span>
                    </div>
                    {isRecommended && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-fixed text-primary font-semibold">
                        Recommended Start
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-on-surface-variant italic">Files will appear in the Code Explorer.</div>
            )}
          </div>

          {meta.readme && (
            <div className="mt-5 pt-4 border-t border-surface-container">
              <div className="text-xs font-bold text-on-surface mb-2 font-mono uppercase text-outline">
                README Excerpt
              </div>
              <div className="text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-xl max-h-36 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed">
                {meta.readme.slice(0, 600)}...
              </div>
            </div>
          )}
        </div>

        {/* Starter Guide Next Step */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between">
          <div>
            <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase font-mono">
              Starter Guide
            </span>
            <h3 className="text-sm font-bold mt-3 text-on-surface">Recommended Next Step</h3>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              Start by reviewing <span className="font-mono text-primary font-semibold">{meta.recommendedStartFile}</span>.
              Estimated onboarding time: <span className="font-semibold text-on-surface">~{meta.estimatedOnboardingMinutes} minutes</span>.
            </p>

            <div className="mt-4 p-3 bg-surface-container-low rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-on-surface font-medium">
                <span className="text-primary font-bold">1.</span> Explore core architecture
              </div>
              <div className="flex items-center gap-2 text-on-surface font-medium">
                <span className="text-primary font-bold">2.</span> Read beginner explanations
              </div>
              <div className="flex items-center gap-2 text-on-surface font-medium">
                <span className="text-primary font-bold">3.</span> Pick your first contribution
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Link
              href={`/repository/${owner}/${repo}/code`}
              className="block w-full py-2.5 bg-primary-container hover:bg-primary text-white text-center text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              Open in Code Explorer →
            </Link>
            <Link
              href={`/repository/${owner}/${repo}/contributions`}
              className="block w-full py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-center text-xs font-semibold rounded-xl transition-colors"
            >
              Browse First Contributions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
