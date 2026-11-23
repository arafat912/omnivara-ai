import httpx

from app.core.config import settings


async def search_web(query: str, max_results: int = 5) -> list[dict[str, str]]:
    if not settings.tavily_api_key:
        raise RuntimeError("Web search is not configured. Add TAVILY_API_KEY to the server environment.")
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": query,
                "search_depth": "basic",
                "max_results": max(1, min(max_results, 8)),
                "include_answer": False,
            },
        )
        response.raise_for_status()
        data = response.json()
    return [
        {
            "title": str(item.get("title", ""))[:300],
            "url": str(item.get("url", ""))[:2000],
            "content": str(item.get("content", ""))[:1500],
        }
        for item in data.get("results", [])
        if item.get("url") and item.get("content")
    ]
