from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Memory, User

router = APIRouter(prefix="/memories", tags=["memory"])


class MemoryCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class MemoryResponse(BaseModel):
    id: int
    content: str
    created_at: str


@router.get("", response_model=list[MemoryResponse])
def list_memories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(
        select(Memory).where(Memory.user_id == user.id).order_by(Memory.created_at.desc()).limit(200)
    ).all()
    return [{"id": row.id, "content": row.content, "created_at": row.created_at.isoformat()} for row in rows]


@router.post("", response_model=MemoryResponse, status_code=201)
def create_memory(payload: MemoryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Memory cannot be empty")
    row = Memory(user_id=user.id, content=content)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "content": row.content, "created_at": row.created_at.isoformat()}


@router.delete("/{memory_id}", status_code=204)
def delete_memory(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.scalar(select(Memory).where(Memory.id == memory_id, Memory.user_id == user.id))
    if row is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(row)
    db.commit()
