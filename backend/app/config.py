"""
Configuración de SENNOVA CGAO
REGLA ANTI-HARDCODING: Todas las configuraciones sensibles desde variables de entorno
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os
import warnings


class Settings(BaseSettings):
    # Database - Soporte para construcción dinámica de URL
    DB_USER: str = os.getenv("DB_USER", "sennova")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "sennova123")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5434")
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
    # El modo desarrollo se pide explícitamente. Con el default invertido, un
    # despliegue que olvide definir DEBUG obtenía a la vez el JWT_SECRET por
    # defecto, la contraseña de siembra por defecto y el CORS abierto a la LAN,
    # porque validate_production_settings solo corre cuando DEBUG es false.
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Servidor
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", 
        "http://localhost:3006,http://127.0.0.1:3006,http://localhost:5173,"
        "http://127.0.0.1:5173,http://localhost:3110,http://localhost:3100")
    
    # URLs públicas (para emails, links, etc.)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3006")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    # Initial Setup & Seeding
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "admin@sena.edu.co")
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "")
    INITIAL_ADMIN_NOMBRE: str = os.getenv("INITIAL_ADMIN_NOMBRE", "Administrador SENNOVA")
    INITIAL_ADMIN_DOCUMENTO: str = os.getenv("INITIAL_ADMIN_DOCUMENTO", "admin01")
    INITIAL_ADMIN_SEDE: str = os.getenv("INITIAL_ADMIN_SEDE", "CGAO")
    SEED_INITIAL_DATA: bool = os.getenv("SEED_INITIAL_DATA", "false").lower() == "true"
    
    # Configuración adicional
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "storage")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "50"))  # MB
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    # Redis - Configuración Universal (Local / Coolify)
    REDIS_HOST: str = os.getenv("REDIS_HOST", "127.0.0.1")
    
    # SMTP
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@sena.edu.co")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() == "true"

    REDIS_PORT: str = os.getenv("REDIS_PORT", "6380")
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    
    # Derived Redis URL
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env") if os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")) else ".env",
        case_sensitive=True,
        extra="ignore"
    )


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
        
        if settings.SEED_INITIAL_DATA and len(settings.INITIAL_ADMIN_PASSWORD) < 12:
            raise ValueError(
                "🚨 INITIAL_ADMIN_PASSWORD no es segura para producción. "
                "Debe tener mínimo 12 caracteres. Defínela en el entorno o "
                "desactiva SEED_INITIAL_DATA; un administrador con contraseña "
                "por defecto no puede quedar publicado."
            )


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    validate_production_settings(settings)
    return settings
