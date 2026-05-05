"""
Configuración de SENNOVA CGAO
REGLA ANTI-HARDCODING: Todas las configuraciones sensibles desde variables de entorno
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import warnings


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
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    
    # App
    APP_NAME: str = os.getenv("APP_NAME", "SENNOVA CGAO API")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Servidor
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", 
        "http://localhost:3110,http://localhost:3100,http://localhost:5173,"
        "http://127.0.0.1:3110,http://127.0.0.1:3100,http://127.0.0.1:3001")
    
    # URLs públicas (para emails, links, etc.)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    # Initial Setup
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "admin@sena.edu.co")
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "123456")
    
    # Configuración adicional
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "50"))  # MB
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env") if os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")) else ".env"
        case_sensitive = True
        extra = "ignore"


def validate_production_settings(settings: Settings):
    """Valida configuraciones críticas en producción"""
    if not settings.DEBUG:
        # En producción, validar que no se usen valores por defecto inseguros
        
        if "sennova-secret-key" in settings.JWT_SECRET or len(settings.JWT_SECRET) < 32:
            raise ValueError(
                "🚨 JWT_SECRET no es seguro para producción. "
                "Debe tener mínimo 32 caracteres y no ser el valor por defecto. "
                "Genera uno nuevo con: openssl rand -base64 32"
            )
        
        if "localhost" in settings.ALLOWED_ORIGINS:
            warnings.warn(
                "⚠️  ALLOWED_ORIGINS contiene 'localhost' en producción. "
                "Considera removerlo si no es necesario.",
                UserWarning
            )
        
        # Solo validar DB_PASSWORD si no se usa DATABASE_URL (que ya contiene la contraseña)
        if not settings.DATABASE_URL and ("sennova123" in settings.DB_PASSWORD or len(settings.DB_PASSWORD) < 12):
            raise ValueError(
                "🚨 DB_PASSWORD no es segura para producción. "
                "Debe tener mínimo 12 caracteres y no ser el valor por defecto."
            )
        
        if "123456" in settings.INITIAL_ADMIN_PASSWORD:
            warnings.warn(
                "⚠️  INITIAL_ADMIN_PASSWORD es el valor por defecto. "
                "Considera cambiarlo inmediatamente después del primer login.",
                UserWarning
            )


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    validate_production_settings(settings)
    return settings
