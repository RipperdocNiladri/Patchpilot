import { CodeExplanation } from "@/types";
import type { AskQuestionResponse } from "@/lib/api";
import {
  DEMO_CODE_EXPLANATION,
  DEMO_FILES,
  isDemoRepo,
} from "@/data/demo-repository";
import { GemmaClient } from "@/lib/ai/gemma";
import {
  buildAskQuestionPrompt,
  buildExplainCodePrompt,
} from "@/lib/ai/prompts";
import { GitHubClient } from "@/lib/github/client";
import {
  HttpError,
  validateFilePath,
  validateIdentifier,
} from "@/lib/validation";

const MAX_PROMPT_CHARS = 12_000;

export class AnalysisService {
  private readonly github: GitHubClient;
  private readonly gemma: GemmaClient;

  constructor(githubClient?: GitHubClient, gemmaClient?: GemmaClient) {
    this.github = githubClient ?? new GitHubClient();
    this.gemma = gemmaClient ?? new GemmaClient();
  }

  async explainFile(
    owner: string,
    repo: string,
    path: string
  ): Promise<CodeExplanation> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");
    const cleanPath = validateFilePath(path);

    if (isDemoRepo(cleanOwner, cleanRepo) && !this.gemma.isConfigured) {
      if (cleanPath in DEMO_FILES && cleanPath === "app/routers/tasks.py") {
        return DEMO_CODE_EXPLANATION;
      }
    }

    let rawCode = "";
    let isBinary = false;

    if (isDemoRepo(cleanOwner, cleanRepo) && cleanPath in DEMO_FILES) {
      rawCode = DEMO_FILES[cleanPath].content;
      isBinary = DEMO_FILES[cleanPath].isBinary;
    } else {
      const fileData = await this.github.getFileContent(
        cleanOwner,
        cleanRepo,
        cleanPath
      );
      rawCode = fileData.content;
      isBinary = fileData.isBinary;
    }

    if (isBinary) {
      return {
        filePath: cleanPath,
        linesRange: "N/A",
        rawCode: "[Binary file: cannot be analyzed or displayed]",
        summary:
          "This is a binary file (such as an image, executable, or compiled asset) and cannot be explained as source code.",
        focusLines: [],
        howItWorks: [],
        keyBuildingBlocks: [],
        jargonTerms: [],
        evidenceReferences: [
          "Binary file detected by extension or byte header",
        ],
      };
    }

    const totalLines = rawCode ? rawCode.split(/\r?\n/).length : 0;
    const linesRange = totalLines > 0 ? `lines 1-${totalLines}` : "empty file";

    if (!this.gemma.isConfigured) {
      throw new HttpError(
        503,
        "Gemma AI is not configured. Please configure GEMMA_API_KEY in .env.local (or Vercel Environment Variables) to enable AI code explanations."
      );
    }

    let promptCode = rawCode.slice(0, MAX_PROMPT_CHARS);
    if (rawCode.length > MAX_PROMPT_CHARS) {
      promptCode +=
        "\n... [Remaining lines truncated for model prompt context]";
    }

    const prompt = buildExplainCodePrompt({
      owner: cleanOwner,
      repo: cleanRepo,
      path: cleanPath,
      code: promptCode,
    });

    const data = await this.gemma.generateJson(prompt);

    const summary =
      typeof data.summary === "string" && data.summary.trim()
        ? data.summary.trim()
        : `Source file ${cleanPath} in ${cleanOwner}/${cleanRepo}.`;

    const focusLines = Array.isArray(data.focusLines)
      ? data.focusLines
          .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
          .map((n) => Math.trunc(n))
      : [];

    const howItWorks: CodeExplanation["howItWorks"] = [];
    if (Array.isArray(data.howItWorks)) {
      for (const item of data.howItWorks) {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          howItWorks.push({
            step:
              typeof obj.step === "number"
                ? Math.trunc(obj.step)
                : howItWorks.length + 1,
            title: String(obj.title ?? "Step"),
            description: String(obj.description ?? ""),
            lineRef: String(obj.lineRef ?? ""),
          });
        }
      }
    }

    const keyBuildingBlocks: CodeExplanation["keyBuildingBlocks"] = [];
    if (Array.isArray(data.keyBuildingBlocks)) {
      for (const item of data.keyBuildingBlocks) {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          keyBuildingBlocks.push({
            name: String(obj.name ?? ""),
            description: String(obj.description ?? ""),
            type: String(obj.type ?? "Component"),
          });
        }
      }
    }

    const jargonTerms: CodeExplanation["jargonTerms"] = [];
    if (Array.isArray(data.jargonTerms)) {
      for (const item of data.jargonTerms) {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          jargonTerms.push({
            term: String(obj.term ?? ""),
            definition: String(obj.definition ?? ""),
          });
        }
      }
    }

    const evidenceReferences = Array.isArray(data.evidenceReferences)
      ? data.evidenceReferences.map((e) => String(e))
      : [];

    return {
      filePath: cleanPath,
      linesRange,
      rawCode,
      summary,
      focusLines,
      howItWorks,
      keyBuildingBlocks,
      jargonTerms,
      evidenceReferences,
    };
  }

  async askQuestion(
    owner: string,
    repo: string,
    path: string,
    question: string
  ): Promise<AskQuestionResponse> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");
    const cleanPath = validateFilePath(path);
    const cleanQuestion = (question ?? "").trim();

    if (!cleanQuestion) {
      throw new HttpError(400, "Question cannot be empty.");
    }

    if (isDemoRepo(cleanOwner, cleanRepo) && !this.gemma.isConfigured) {
      return {
        answer: `PatchPilot Analysis (Demo Mode): In ${cleanPath}, async functions allow FastAPI to process other incoming HTTP requests concurrently while worker tasks are queued in the background.`,
        evidence: "Line 8: async def create_task(payload: TaskCreate)",
        filePath: cleanPath,
      };
    }

    let rawCode = "";
    let isBinary = false;

    if (isDemoRepo(cleanOwner, cleanRepo) && cleanPath in DEMO_FILES) {
      rawCode = DEMO_FILES[cleanPath].content;
      isBinary = DEMO_FILES[cleanPath].isBinary;
    } else {
      const fileData = await this.github.getFileContent(
        cleanOwner,
        cleanRepo,
        cleanPath
      );
      rawCode = fileData.content;
      isBinary = fileData.isBinary;
    }

    if (isBinary) {
      return {
        answer:
          "This file is binary and cannot be inspected for code questions.",
        evidence: "Binary file",
        filePath: cleanPath,
      };
    }

    if (!this.gemma.isConfigured) {
      throw new HttpError(
        503,
        "Gemma AI is not configured. Please configure GEMMA_API_KEY in .env.local (or Vercel Environment Variables) to ask questions about code."
      );
    }

    const promptCode = rawCode.slice(0, MAX_PROMPT_CHARS);
    const prompt = buildAskQuestionPrompt({
      owner: cleanOwner,
      repo: cleanRepo,
      path: cleanPath,
      code: promptCode,
      question: cleanQuestion,
    });

    const data = await this.gemma.generateJson(prompt);

    return {
      answer:
        typeof data.answer === "string" && data.answer.trim()
          ? data.answer.trim()
          : "No answer could be generated from the file context.",
      evidence:
        typeof data.evidence === "string" && data.evidence.trim()
          ? data.evidence.trim()
          : undefined,
      filePath: cleanPath,
    };
  }
}
