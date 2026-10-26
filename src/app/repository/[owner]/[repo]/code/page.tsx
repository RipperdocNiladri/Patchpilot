"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import { CodeExplanation, FileNode } from "@/types";
import {
  askFileQuestion,
  explainFile,
  fetchFileContent,
  fetchRepositoryOverview,
  fetchRepositoryTree,
  FileContentResponse,
  ApiError,
} from "@/lib/api";

function findNodeByPath(nodes: FileNode[], targetPath: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function findFirstFile(nodes: FileNode[], preferredPath?: string): string {
  if (preferredPath) {
    const match = findNodeByPath(nodes, preferredPath);
    if (match && match.type === "file") return match.path;
  }
  for (const node of nodes) {
    if (node.type === "file") return node.path;
    if (node.children) {
      const nested = findFirstFile(node.children);
      if (nested) return nested;
    }
  }
  return "README.md";
}

export default function CodeExplorer({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = use(params);

  const [tree, setTree] = useState<FileNode[]>([]);
  const [activePath, setActivePath] = useState<string>("");
  const [fileData, setFileData] = useState<FileContentResponse | null>(null);
  const [explanation, setExplanation] = useState<CodeExplanation | null>(null);

  const [treeLoading, setTreeLoading] = useState<boolean>(true);
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [explainLoading, setExplainLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [askLoading, setAskLoading] = useState<boolean>(false);
  const [askError, setAskError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const selectFile = useCallback(async (path: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setActivePath(path);
    setFileLoading(true);
    setExplainLoading(true);
    setAiError(null);
    setAnswer("");
    setQuestion("");
    setAskError(null);

    // 1. Fetch file content
    try {
      const content = await fetchFileContent(owner, repo, path, controller.signal);
      setFileData(content);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setFileData(null);
      setGeneralError(err instanceof Error ? err.message : "Failed to load file content.");
      setFileLoading(false);
      setExplainLoading(false);
      return;
    } finally {
      setFileLoading(false);
    }

    // 2. Fetch AI explanation
    try {
      const exp = await explainFile(owner, repo, path, controller.signal);
      setExplanation(exp);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setExplanation(null);
      if (err instanceof ApiError) {
        setAiError(err.detail);
      } else {
        setAiError(err instanceof Error ? err.message : "AI explanation unavailable.");
      }
    } finally {
      setExplainLoading(false);
    }
  }, [owner, repo]);

  // Load tree and pick initial file
  useEffect(() => {
    let isMounted = true;
    async function loadTree() {
      setTreeLoading(true);
      setGeneralError(null);
      try {
        const [treeData, metaData] = await Promise.all([
          fetchRepositoryTree(owner, repo),
          fetchRepositoryOverview(owner, repo).catch(() => null),
        ]);

        if (!isMounted) return;
        setTree(treeData);

        // Find initial recommended start file or first file
        const recommended = metaData?.recommendedStartFile;
        const initialFile = findFirstFile(treeData, recommended);
        if (initialFile) {
          selectFile(initialFile);
        }
      } catch (err) {
        if (!isMounted) return;
        setGeneralError(err instanceof Error ? err.message : "Failed to load file tree.");
      } finally {
        if (isMounted) setTreeLoading(false);
      }
    }

    loadTree();
    return () => {
      isMounted = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [owner, repo, selectFile]);

  const handleAsk = async () => {
    if (!question.trim() || !activePath) return;
    setAskLoading(true);
    setAskError(null);
    setAnswer("");

    try {
      const res = await askFileQuestion(owner, repo, activePath, question.trim());
      setAnswer(res.answer + (res.evidence ? `\n\nEvidence: ${res.evidence}` : ""));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setAskError(err.detail);
      } else {
        setAskError(err instanceof Error ? err.message : "Failed to get an answer.");
      }
    } finally {
      setAskLoading(false);
    }
  };

  const renderTreeNodes = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isFile = node.type === "file";
      const isActive = node.path === activePath;

      if (!isFile) {
        return (
          <div key={node.path} className="space-y-1">
            <div
              style={{ paddingLeft: `${depth * 12}px` }}
              className="text-on-surface-variant font-semibold flex items-center gap-1.5 py-1 text-xs"
            >
              <span>📁</span> {node.name}
            </div>
            {node.children && <div>{renderTreeNodes(node.children, depth + 1)}</div>}
          </div>
        );
      }

      return (
        <button
          key={node.path}
          onClick={() => selectFile(node.path)}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          className={`w-full text-left py-1 px-2 rounded-lg text-xs flex items-center justify-between group transition-colors ${
            isActive
              ? "bg-primary-fixed text-primary font-bold"
              : "text-on-surface hover:bg-surface-container"
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span>📄</span>
            <span className="truncate">{node.name}</span>
          </div>
          {node.badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary-container text-white shrink-0">
              Start
            </span>
          )}
        </button>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* File tree sidebar */}
      <div className="lg:col-span-3 bg-surface-container-lowest p-4 rounded-2xl border border-surface-container font-mono text-xs shadow-xs flex flex-col max-h-[82vh]">
        <div className="font-bold text-on-surface mb-3 flex items-center justify-between">
          <span>Repository Tree</span>
          <span className="text-[10px] text-outline font-normal">
            {tree.length > 0 ? "Click to view" : ""}
          </span>
        </div>

        {treeLoading ? (
          <div className="py-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px]">Loading tree...</span>
          </div>
        ) : tree.length > 0 ? (
          <div className="overflow-y-auto space-y-0.5 pr-1 flex-1">
            {renderTreeNodes(tree)}
          </div>
        ) : (
          <div className="text-on-surface-variant text-[11px] italic py-4">No files found.</div>
        )}
      </div>

      {/* Main content: code and explanation */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        {/* Active file bar */}
        <div className="bg-surface-container-lowest px-4 py-2.5 rounded-xl border border-surface-container flex items-center justify-between font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-outline">File:</span>
            <span className="font-semibold text-primary truncate">{activePath || "Select a file"}</span>
          </div>
          {fileData?.githubUrl && (
            <a
              href={fileData.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-outline hover:text-primary transition-colors flex items-center gap-1 shrink-0"
            >
              GitHub ↗
            </a>
          )}
        </div>

        {generalError && (
          <div className="p-3 bg-error-container/40 text-error text-xs rounded-xl border border-error/30 font-medium">
            {generalError}
          </div>
        )}

        {/* Code display block */}
        <div className="bg-[#0d1117] text-[#c9d1d9] p-4 rounded-2xl font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed border border-[#30363d] shadow-xs max-h-96">
          {fileLoading ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
              <span>Fetching file source...</span>
            </div>
          ) : fileData ? (
            fileData.content || "// File is empty"
          ) : (
            "// Select a file from the repository tree to inspect source code"
          )}
        </div>

        {/* AI Explanation block */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-bold text-on-surface">Explained Simply</div>
            {explainLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-primary">
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Generating Gemma explanation...</span>
              </div>
            )}
          </div>

          {aiError ? (
            <div className="p-4 bg-surface-container-low rounded-xl text-xs text-on-surface-variant border border-surface-container my-3">
              <div className="font-semibold text-on-surface mb-1 flex items-center gap-1.5">
                <span>ℹ️</span> AI Explanation Status
              </div>
              <p className="leading-relaxed">{aiError}</p>
            </div>
          ) : explanation ? (
            <>
              <p className="text-xs text-on-surface-variant mb-5 leading-relaxed">
                {explanation.summary}
              </p>

              {explanation.howItWorks && explanation.howItWorks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {explanation.howItWorks.map((s) => (
                    <div key={s.step} className="p-3.5 bg-surface-container-low rounded-xl text-xs border border-surface-container/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-primary mr-1">#{s.step} {s.title}</span>
                        {s.lineRef && (
                          <span className="text-[10px] font-mono text-outline">{s.lineRef}</span>
                        )}
                      </div>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">{s.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {explanation.keyBuildingBlocks && explanation.keyBuildingBlocks.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs font-bold text-on-surface mb-2 font-mono uppercase text-outline">
                    Key Building Blocks
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {explanation.keyBuildingBlocks.map((block, i) => (
                      <div key={i} className="p-2.5 bg-surface-container-low rounded-lg text-xs">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-on-surface">{block.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-outline">
                            {block.type}
                          </span>
                        </div>
                        <p className="text-on-surface-variant text-[11px] mt-1">{block.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {explanation.jargonTerms && explanation.jargonTerms.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs font-bold text-on-surface mb-2 font-mono uppercase text-outline">
                    Plain-English Definitions
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {explanation.jargonTerms.map((j, i) => (
                      <div key={i} className="p-2.5 bg-surface-container-low rounded-lg text-xs">
                        <span className="font-bold text-primary">{j.term}: </span>
                        <span className="text-on-surface-variant text-[11px]">{j.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            !explainLoading && (
              <p className="text-xs text-on-surface-variant italic mb-4">
                Select a source file to see a beginner-friendly code explanation.
              </p>
            )
          )}

          {/* Interactive Question Answering */}
          <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2 mt-4">
            <span className="text-xs font-bold text-on-surface">
              Ask PatchPilot about {activePath ? <span className="font-mono text-primary">{activePath}</span> : "this file"}
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="e.g. What does this function do or why is async used here?"
                className="flex-1 px-3 py-2 rounded-lg bg-surface-container-lowest text-xs text-on-surface outline-none border border-surface-container focus:border-primary-container"
              />
              <button
                onClick={handleAsk}
                disabled={askLoading || !question.trim()}
                className="px-5 py-2 bg-primary-container hover:bg-primary disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {askLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  "Ask"
                )}
              </button>
            </div>

            {askError && (
              <div className="p-2.5 bg-error-container/40 rounded-lg text-xs text-error font-mono mt-1">
                {askError}
              </div>
            )}

            {answer && (
              <div className="p-3 bg-surface-container-lowest rounded-lg text-xs text-on-surface font-mono mt-2 border border-surface-container whitespace-pre-wrap leading-relaxed">
                <span className="text-primary font-bold block mb-1">PatchPilot Analysis:</span>
                {answer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
