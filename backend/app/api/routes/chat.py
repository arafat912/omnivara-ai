from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Conversation, Message, User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_provider import generate_reply

router = APIRouter(tags=["chat"])


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

    try:
        reply, provider = await generate_reply(
            payload.message,
            payload.language,
            history=history,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="AI provider request failed. Check server configuration.",
        ) from exc

    db.add(
        Message(
            conversation_id=conversation.id,
            role="user",
            content=payload.message,
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
