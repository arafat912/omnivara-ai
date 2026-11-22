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
    else:
        conversation = db.scalar(select(Conversation).where(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == user.id,
        ))
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

    db.add(Message(conversation_id=conversation.id, role="user", content=payload.message, provider="user"))
    try:
        reply, provider = await generate_reply(payload.message, payload.language)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail="AI provider request failed. Check server configuration.") from exc

    db.add(Message(conversation_id=conversation.id, role="assistant", content=reply, provider=provider))
    db.commit()
    return ChatResponse(reply=reply, provider=provider, conversation_id=conversation.id)
