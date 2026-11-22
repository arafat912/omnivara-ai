from typing import Sequence

from app.core.config import settings

SYSTEM_PROMPT = (
    "You are OMNIVARA, a helpful, honest multilingual AI assistant. "
    "Detect and respond in the user's language when the preferred language is auto. "
    "Use the conversation history for context. Never claim actions you did not perform."
)


async def generate_reply(
    message: str,
    language: str = "auto",
    history: Sequence[dict[str, str]] | None = None,
) -> tuple[str, str]:
    provider = settings.ai_provider.lower()
    history = list(history or [])
    user_message = {"role": "user", "content": message}

    if provider in ("auto", "openai") and settings.openai_api_key:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.openai_api_key)
            messages = [
                {"role": "system", "content": f"{SYSTEM_PROMPT} Preferred language: {language}."},
                *history,
                user_message,
            ]
            result = await client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
            )
            return result.choices[0].message.content or "", "openai"
        except Exception:
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
            contents.append({"role": "user", "parts": [{"text": message}]})
            result = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=f"{SYSTEM_PROMPT} Preferred language: {language}."
                ),
            )
            return result.text or "", "gemini"
        except Exception:
            if provider == "gemini":
                raise

    return (
        "হ্যালো! আমি OMNIVARA-এর ডেমো মোডে আছি। বাস্তব AI উত্তর পেতে "
        ".env ফাইলে OpenAI অথবা Gemini API key যোগ করুন।",
        "mock",
    )
