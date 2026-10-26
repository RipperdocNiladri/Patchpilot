"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { ContributionOpportunity } from "@/types";
import { fetchContributions, ApiError } from "@/lib/api";

export default function ContributionsPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = use(params);

  const [opportunities, setOpportunities] = useState<ContributionOpportunity[]>([]);
  const [selected, setSelected] = useState<ContributionOpportunity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opps = await fetchContributions(owner, repo);
      setOpportunities(opps);
      if (opps.length > 0) {
        setSelected(opps[0]);
      } else {
        setSelected(null);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message || "Failed to load contribution opportunities.");
      } else {
        setError("An unexpected error occurred while finding opportunities.");
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
      <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 border-3 border-primary-container border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-mono text-on-surface-variant">
          Discovering beginner contribution opportunities for <span className="font-bold text-on-surface">{owner}/{repo}</span>...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-error-container/30 border border-error/30 rounded-2xl p-6 text-center">
          <div className="text-error font-bold text-sm mb-2">Unable to load contribution opportunities</div>
          <p className="text-xs text-on-surface-variant mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary transition-colors"
            >
              Retry Request
            </button>
            <Link
              href={`/repository/${owner}/${repo}`}
              className="px-4 py-2 bg-surface-container text-on-surface text-xs font-semibold rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-surface-container shadow-xs">
          <div className="text-3xl mb-3">🔍</div>
          <h2 className="text-lg font-bold text-on-surface mb-2">No Verified Beginner Issues Found</h2>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
            We scanned open GitHub issues and source files for {owner}/{repo}, but did not find active beginner-labeled issues or unresolved TODO comments.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href={`/repository/${owner}/${repo}/code`}
              className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary transition-colors"
            >
              Explore Code Instead →
            </Link>
            <a
              href={`https://github.com/${owner}/${repo}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-surface-container text-on-surface text-xs font-semibold rounded-xl hover:bg-surface-container-high transition-colors"
            >
              View All GitHub Issues ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Opportunities list on the left */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-on-surface">Find your first contribution</h1>
          <span className="text-xs font-mono text-outline">
            {opportunities.length} candidate{opportunities.length === 1 ? "" : "s"} found
          </span>
        </div>

        <div className="space-y-3">
          {opportunities.map((op) => {
            const isSelected = selected?.id === op.id;
            return (
              <div
                key={op.id}
                onClick={() => setSelected(op)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-xs ${
                  isSelected
                    ? "bg-surface-container-lowest ring-2 ring-primary-container border-transparent"
                    : "bg-surface-container-lowest hover:border-outline-variant"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
                      {op.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-outline">
                      {op.sourceBadge.label}
                    </span>
                  </div>
                  <span className="text-outline">~{op.estimatedMinutes} mins</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface leading-snug">{op.title}</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2 leading-relaxed">
                  {op.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel on the right */}
      <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-5 sticky top-20 max-h-[85vh] overflow-y-auto">
        {selected ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-outline uppercase font-semibold">
                  Contribution Blueprint
                </span>
                {selected.issueUrl && (
                  <a
                    href={selected.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary font-mono hover:underline flex items-center gap-1"
                  >
                    View Issue on GitHub ↗
                  </a>
                )}
              </div>
              <h2 className="text-base font-bold text-on-surface leading-snug">{selected.title}</h2>
              <div className="flex gap-2 mt-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface">
                  Branch: {selected.suggestedBranchName}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface">
                  Safety: {selected.safetyRating}%
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-xl text-xs border border-surface-container/60">
              <span className="font-bold text-on-surface block mb-1">Why it matters</span>
              <span className="text-on-surface-variant leading-relaxed">{selected.whyItMatters}</span>
            </div>

            {selected.targetFiles && selected.targetFiles.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase font-mono text-outline block mb-2">
                  Target Files
                </span>
                <div className="space-y-1">
                  {selected.targetFiles.map((tf, i) => (
                    <div key={i} className="p-2 bg-surface-container-low rounded-lg text-xs font-mono flex items-center justify-between">
                      <span className="text-primary font-semibold">{tf.path}</span>
                      <span className="text-outline text-[11px]">{tf.lines}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase font-mono text-outline block">
                Safe First Steps
              </span>
              {selected.steps.map((st) => (
                <div key={st.stepNumber} className="text-xs p-3 bg-surface rounded-xl border border-surface-container/60">
                  <div className="flex items-start gap-1.5 mb-1">
                    <span className="font-bold text-primary shrink-0">Step {st.stepNumber}:</span>
                    <span className="text-on-surface font-medium leading-relaxed">{st.instruction}</span>
                  </div>
                  {st.command && (
                    <pre className="mt-2 p-2 bg-surface-container-lowest rounded-lg font-mono text-[11px] text-primary overflow-x-auto border border-surface-container">
                      {st.command}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-tertiary-fixed/30 rounded-xl text-xs text-tertiary border border-tertiary-fixed">
              <strong>Maintainer Tip:</strong> {selected.maintainerTip}
            </div>
          </>
        ) : (
          <div className="text-xs text-on-surface-variant italic py-8 text-center">
            Select an opportunity from the list to view its blueprint.
          </div>
        )}
      </div>
    </div>
  );
}
