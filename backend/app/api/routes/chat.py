from fastapi import APIRouter,HTTPException
from app.schemas.chat import ChatRequest,ChatResponse
from app.services.ai_provider import generate_reply
router=APIRouter(tags=['chat'])
@router.post('/chat',response_model=ChatResponse)
async def chat(payload:ChatRequest):
 try:
  reply,provider=await generate_reply(payload.message,payload.language)
  return ChatResponse(reply=reply,provider=provider)
 except Exception as exc:
  raise HTTPException(status_code=502,detail='AI provider request failed. Check server configuration and logs.') from exc
