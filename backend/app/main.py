from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes.chat import router as chat_router
from app.api.routes.health import router as health_router
app = FastAPI(title=settings.app_name, version='0.1.0')
origins=[x.strip() for x in settings.cors_origins.split(',') if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=['GET','POST'],allow_headers=['Content-Type','Authorization'])
app.include_router(health_router)
app.include_router(chat_router,prefix='/api/v1')
@app.get('/')
async def root(): return {'name':settings.app_name,'status':'running','docs':'/docs'}
