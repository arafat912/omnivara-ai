from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_current_user
from app.models import User
from app.services.web_search import search_web

router = APIRouter(prefix="/search", tags=["web search"])


@router.get("")
async def web_search(
    q: str = Query(min_length=2, max_length=500),
    user: User = Depends(get_current_user),
):
    try:
        results = await search_web(q)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Web search provider is temporarily unavailable") from exc
    return {"query": q, "results": results}
