from functools import lru_cache
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Google Gen AI / Gemma settings
    GEMMA_API_KEY: str | None = Field(default=None)
    GEMMA_MODEL: str = Field(default="gemma-4-26b-a4b-it")

    # GitHub integration
    GITHUB_TOKEN: str | None = Field(default=None)
    GITHUB_API_TIMEOUT: float = Field(default=15.0)
    MAX_FILE_BYTES: int = Field(default=500_000)  # 500 KB limit for fetched files
    MAX_FILE_CONTENT_CHARS: int = Field(default=40_000)

    # CORS and Host settings
    FRONTEND_ORIGIN: str = Field(default="http://localhost:3000")
    HOST: str = Field(default="127.0.0.1")
    PORT: int = Field(default=8000)

    @property
    def cors_origins(self) -> List[str]:
        origins = [orig.strip() for orig in self.FRONTEND_ORIGIN.split(",") if orig.strip()]
        # Always ensure standard localhost variants are supported
        if "http://localhost:3000" not in origins:
            origins.append("http://localhost:3000")
        if "http://127.0.0.1:3000" not in origins:
            origins.append("http://127.0.0.1:3000")
        return origins


@lru_cache()
def get_settings() -> Settings:
    return Settings()
