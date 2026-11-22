from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Conversation, User
from app.schemas.conversation import ConversationResponse

router = APIRouter(prefix="/conversations", tags=["conversations"])

@router.get("", response_model=list[ConversationResponse])
def list_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Conversation).where(Conversation.user_id == user.id).options(selectinload(Conversation.messages)).order_by(Conversation.updated_at.desc())
    return list(db.scalars(stmt).all())

@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id).options(selectinload(Conversation.messages))
    conversation = db.scalar(stmt)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conversation = db.scalar(select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id))
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conversation)
    db.commit()
