import base64
import logging
import re
from typing import Sequence

from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are OMNIVARA, a helpful, honest multilingual AI assistant. "
    "Detect and respond in the user's language when the preferred language is auto. "
    "Use the conversation history for context. Never claim actions you did not perform."
)

IMAGE_DATA_URL = re.compile(r"^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$")
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _decode_image(image_data: str | None) -> tuple[str, bytes] | None:
    if not image_data:
        return None
    match = IMAGE_DATA_URL.fullmatch(image_data)
    if not match:
        raise ValueError("Please attach a JPG, PNG, or WEBP image.")
    mime_type, encoded = match.groups()
    try:
        raw = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise ValueError("The attached image could not be read.") from exc
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("Images must be smaller than 5 MB.")
    return mime_type, raw


async def generate_reply(
    message: str,
    language: str = "auto",
    history: Sequence[dict[str, str]] | None = None,
    image_data: str | None = None,
) -> tuple[str, str]:
    provider = settings.ai_provider.lower()
    history = list(history or [])
    image = _decode_image(image_data)

    if provider in ("auto", "openai") and settings.openai_api_key:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.openai_api_key)
            messages = [
                {"role": "system", "content": f"{SYSTEM_PROMPT} Preferred language: {language}."},
                *history,
            ]
            user_content: str | list[dict] = message
            if image:
                mime_type, raw = image
                user_content = [
                    {"type": "text", "text": message},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{base64.b64encode(raw).decode('ascii')}"},
                    },
                ]
            messages.append({"role": "user", "content": user_content})
            result = await client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
            )
            return result.choices[0].message.content or "", "openai"
        except Exception:
            logger.exception("OpenAI API request failed")
            if provider == "openai":
                raise

    if provider in ("auto", "gemini") and settings.gemini_api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.gemini_api_key)
            contents = [
                {
                    "role": "model" if item["role"] == "assistant" else "user",
                    "parts": [{"text": item["content"]}],
                }
                for item in history
            ]
            parts = [types.Part.from_text(text=message)]
            if image:
                mime_type, raw = image
                parts.append(types.Part.from_bytes(data=raw, mime_type=mime_type))
            contents.append({"role": "user", "parts": parts})
            result = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=f"{SYSTEM_PROMPT} Preferred language: {language}."
                ),
            )
            return result.text or "", "gemini"
        except Exception:
            logger.exception("Gemini API request failed")
            if provider == "gemini":
                raise

    if image:
        raise RuntimeError("Image understanding requires a configured vision-capable AI provider.")

    return (
        "হ্যালো! আমি OMNIVARA-এর ডেমো মোডে আছি। বাস্তব AI উত্তর পেতে "
        ".env ফাইলে OpenAI অথবা Gemini API key যোগ করুন।",
        "mock",
    )
