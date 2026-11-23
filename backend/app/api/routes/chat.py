from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import Conversation, Memory, Message, User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_provider import generate_reply
from app.services.web_search import search_web

router = APIRouter(tags=["chat"])

SEARCH_HINTS = (
    "latest", "current", "today", "right now", "this week", "recent",
    "search the web", "search online", "look up", "news", "price today",
    "সর্বশেষ", "বর্তমান", "আজকের", "এখনকার", "খুঁজে দেখ", "ইন্টারনেটে খোঁজ",
    "সাম্প্রতিক", "আজকের খবর", "দাম কত",
)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.conversation_id is None:
        conversation = Conversation(
            user_id=user.id,
            title=payload.message[:80].strip() or "New conversation",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        history: list[dict[str, str]] = []
    else:
        conversation = db.scalar(
            select(Conversation).where(
                Conversation.id == payload.conversation_id,
                Conversation.user_id == user.id,
            )
        )
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        previous_messages = db.scalars(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.id.desc())
            .limit(12)
        ).all()
        history = [
            {"role": item.role, "content": item.content}
            for item in reversed(previous_messages)
            if item.role in ("user", "assistant")
        ]

    memories = db.scalars(
        select(Memory).where(Memory.user_id == user.id).order_by(Memory.created_at.desc()).limit(20)
    ).all()
    if memories:
        memory_text = "\n".join(f"- {item.content}" for item in memories)
        history.insert(0, {
            "role": "assistant",
            "content": "[Private saved memory for this account; use only when relevant]\n" + memory_text,
        })

    lowered = payload.message.lower()
    should_search = payload.web_search or any(hint in lowered for hint in SEARCH_HINTS)
    if should_search:
        try:
            results = await search_web(payload.message, max_results=5)
            if results:
                web_context = "\n".join(
                    f"- {item['title']} | {item['url']}\n{item['content']}"
                    for item in results
                )
                history.append({
                    "role": "assistant",
                    "content": "[Fresh web search results; cite the URLs in your answer]\n" + web_context,
                })
        except RuntimeError as exc:
            if payload.web_search:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            if payload.web_search:
                raise HTTPException(status_code=502, detail="Web search provider is temporarily unavailable") from exc

    try:
        reply, provider = await generate_reply(
            payload.message,
            payload.language,
            history=history,
            image_data=payload.image_data,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="AI provider request failed. Check server configuration.",
        ) from exc

    saved_user_message = payload.message
    if payload.image_data:
        saved_user_message = f"{saved_user_message}\n[Image attached]"
    db.add(
        Message(
            conversation_id=conversation.id,
            role="user",
            content=saved_user_message,
            provider="user",
        )
    )
    db.add(
        Message(
            conversation_id=conversation.id,
            role="assistant",
            content=reply,
            provider=provider,
        )
    )
    db.commit()
    return ChatResponse(
        reply=reply,
        provider=provider,
        conversation_id=conversation.id,
    )
