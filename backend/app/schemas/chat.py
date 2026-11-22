from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    language: str = Field(default="auto", max_length=32)
    conversation_id: int | None = None
    image_data: str | None = Field(default=None, max_length=7_000_000)

class ChatResponse(BaseModel):
    reply: str
    provider: str
    conversation_id: int
