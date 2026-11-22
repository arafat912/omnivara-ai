from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "OMNIVARA AI"
    cors_origins: str = "http://localhost:3000"
    ai_provider: str = "auto"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    database_url: str = "sqlite:///./omnivara.db"
    jwt_secret: str = "CHANGE-ME-TO-A-LONG-RANDOM-SECRET-BEFORE-DEPLOY"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
