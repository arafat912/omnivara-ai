from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
 app_env:str='development'
 app_name:str='OMNIVARA AI'
 cors_origins:str='http://localhost:3000'
 ai_provider:str='auto'
 openai_api_key:str=''
 openai_model:str='gpt-4o-mini'
 gemini_api_key:str=''
 gemini_model:str='gemini-2.0-flash'
 model_config=SettingsConfigDict(env_file='.env',extra='ignore')
settings=Settings()
