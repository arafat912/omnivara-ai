from app.core.config import settings
SYSTEM_PROMPT='You are OMNIVARA, a helpful and honest multilingual AI assistant. Detect the user language when language is auto. Never claim actions you did not perform.'
async def generate_reply(message:str,language:str='auto')->tuple[str,str]:
 provider=settings.ai_provider.lower()
 if provider in ('auto','openai') and settings.openai_api_key:
  try:
   from openai import AsyncOpenAI
   client=AsyncOpenAI(api_key=settings.openai_api_key)
   result=await client.chat.completions.create(model=settings.openai_model,messages=[{'role':'system','content':SYSTEM_PROMPT+f' Preferred language: {language}.'},{'role':'user','content':message}])
   return result.choices[0].message.content or '', 'openai'
  except Exception:
   if provider=='openai': raise
 if provider in ('auto','gemini') and settings.gemini_api_key:
  try:
   from google import genai
   client=genai.Client(api_key=settings.gemini_api_key)
   result=await client.aio.models.generate_content(model=settings.gemini_model,contents=f'{SYSTEM_PROMPT}\nPreferred language: {language}\nUser: {message}')
   return result.text or '', 'gemini'
  except Exception:
   if provider=='gemini': raise
 return 'হ্যালো! আমি OMNIVARA-এর ডেমো মোডে আছি। বাস্তব AI উত্তর পেতে .env ফাইলে OpenAI অথবা Gemini API key যোগ করুন।','mock'
