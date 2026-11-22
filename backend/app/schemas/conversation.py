from datetime import datetime
from pydantic import BaseModel, ConfigDict

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    provider: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse] = []
    model_config = ConfigDict(from_attributes=True)
