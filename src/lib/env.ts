export interface ServerConfig {
  GEMMA_API_KEY: string;
  GEMMA_MODEL: string;
  GITHUB_TOKEN: string;
  GITHUB_API_TIMEOUT_MS: number;
  MAX_FILE_BYTES: number;
  MAX_FILE_CONTENT_CHARS: number;
}

export function getServerConfig(overrides?: Partial<ServerConfig>): ServerConfig {
  const gemmaApiKey = (process.env.GEMMA_API_KEY ?? "").trim();
  const gemmaModel = (process.env.GEMMA_MODEL ?? "").trim() || "gemma-4-26b-a4b-it";
  const githubToken = (process.env.GITHUB_TOKEN ?? "").trim();

  return {
    GEMMA_API_KEY: gemmaApiKey,
    GEMMA_MODEL: gemmaModel,
    GITHUB_TOKEN: githubToken,
    GITHUB_API_TIMEOUT_MS: 15_000,
    MAX_FILE_BYTES: 500_000,
    MAX_FILE_CONTENT_CHARS: 40_000,
    ...overrides,
  };
}
