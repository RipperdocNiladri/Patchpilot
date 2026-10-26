import { getServerConfig, ServerConfig } from "@/lib/env";
import { SYSTEM_SAFETY_PREAMBLE } from "@/lib/ai/prompts";
import { HttpError } from "@/lib/validation";

interface GenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
  };
}

export class GemmaClient {
  private readonly configOverrides?: Partial<ServerConfig>;
  private readonly fetchImpl: typeof fetch;

  constructor(
    configOverrides?: Partial<ServerConfig>,
    fetchImpl: typeof fetch = globalThis.fetch
  ) {
    this.configOverrides = configOverrides;
    this.fetchImpl = fetchImpl;
  }

  private get config(): ServerConfig {
    return getServerConfig(this.configOverrides);
  }

  get isConfigured(): boolean {
    return Boolean(this.config.GEMMA_API_KEY && this.config.GEMMA_API_KEY.trim());
  }

  cleanJsonResponse(rawText: string): string {
    const trimmed = (rawText || "").trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1].trim();
    }
    return trimmed;
  }

  async generateJson(
    prompt: string,
    systemInstruction: string = SYSTEM_SAFETY_PREAMBLE
  ): Promise<Record<string, unknown>> {
    const apiKey = this.config.GEMMA_API_KEY.trim();
    if (!apiKey) {
      throw new HttpError(
        503,
        "Gemma AI is not configured. Please configure GEMMA_API_KEY in .env.local (or Vercel Environment Variables) to enable AI features."
      );
    }

    const modelName = this.config.GEMMA_MODEL || "gemma-4-26b-a4b-it";
    const fullPrompt = `${systemInstruction}\n\n${prompt}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: fullPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpError(502, `Gemma model generation failed: ${msg}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new HttpError(
        502,
        `Gemma model generation failed (${response.status}): ${errText.slice(0, 200)}`
      );
    }

    const payload = (await response.json()) as GenerateContentResponse;
    const responseText =
      payload.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "";

    const cleaned = this.cleanJsonResponse(responseText);
    try {
      const parsed = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Parsed response is not a JSON object");
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new HttpError(
        502,
        "Gemma model returned an invalid structured JSON response. Please retry."
      );
    }
  }
}
