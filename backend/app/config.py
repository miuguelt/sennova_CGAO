from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database - Soporte para construcción dinámica de URL
    DB_USER: str = os.getenv("DB_USER", "sennova")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "sennova123")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "sennova")
    
    # Prioridad: 1. DATABASE_URL completa, 2. Construcción dinámica, 3. SQLite default
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    def __init__(self, **values):
        super().__init__(**values)
        if not self.DATABASE_URL:
            # Si no hay URL completa, intentamos ver si hay datos para PostgreSQL o usamos SQLite
            if os.getenv("DB_PASSWORD"):
                self.DATABASE_URL = f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            else:
                self.DATABASE_URL = "sqlite:///./sennova.db"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "sennova-secret-key-change-in-production-min-32-chars")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # App
    APP_NAME: str = "SENNOVA CGAO API"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3110,http://localhost:3100,http://localhost:5173,http://127.0.0.1:3110,http://127.0.0.1:3100,http://127.0.0.1:3001")
    
    # Initial Setup
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "admin@sena.edu.co")
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "123456")
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env") if os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")) else ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
