import json
import logging
import re
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from app.config import Settings, get_settings
from app.services.prompts import SYSTEM_SAFETY_PREAMBLE

logger = logging.getLogger("patchpilot.gemma")


class GemmaClient:
    """Client for interacting with Google Gen AI Gemma models."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._client = None

    @property
    def is_configured(self) -> bool:
        """Check if GEMMA_API_KEY is configured and non-empty."""
        return bool(self.settings.GEMMA_API_KEY and self.settings.GEMMA_API_KEY.strip())

    def _get_client(self):
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemma AI is not configured. Set GEMMA_API_KEY in backend/.env to enable AI features.",
            )
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.settings.GEMMA_API_KEY.strip())
            except Exception as e:
                logger.error(f"Failed to initialize Google Gen AI client: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to initialize Gen AI SDK: {str(e)}",
                )
        return self._client

    def _clean_json_response(self, text: str) -> str:
        """Strip markdown fences and whitespace from model response."""
        text = text.strip()
        # Match ```json ... ``` or ``` ... ```
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if fence_match:
            return fence_match.group(1).strip()
        return text

    async def generate_json(
        self, prompt: str, system_instruction: str = SYSTEM_SAFETY_PREAMBLE
    ) -> Dict[str, Any]:
        """Generate structured JSON response using Gemma model."""
        client = self._get_client()
        model_name = self.settings.GEMMA_MODEL or "gemma-4-26b-a4b-it"

        try:
            import asyncio
            from google.genai import types

            loop = asyncio.get_running_loop()
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2,
                    response_mime_type="application/json",
                )
                response = await loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config,
                    ),
                )
            except Exception as model_err:
                logger.warning(
                    f"Model '{model_name}' failed with JSON mime-type config, falling back to standard config: {model_err}"
                )
                fallback_config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2,
                )
                response = await loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=fallback_config,
                    ),
                )

            response_text = getattr(response, "text", "") or ""
            cleaned = self._clean_json_response(response_text)
            return json.loads(cleaned)

        except json.JSONDecodeError as exc:
            logger.error(f"Failed to parse JSON from Gemma response: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemma model returned an invalid structured JSON response. Please retry.",
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error calling Gemma model '{model_name}': {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemma model generation failed: {str(exc)}",
            )
