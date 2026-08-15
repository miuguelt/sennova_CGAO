import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.config import get_settings

settings = get_settings()

# Configuración según el tipo de base de datos
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite - sin pool_pre_ping (no soportado)
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # PostgreSQL u otros
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "10")),
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False,
        connect_args={"connect_timeout": 10}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def safe_commit(db: Session):
    """Realiza commit seguro con rollback automático en caso de error."""
    try:
        db.commit()
    except Exception as err:
        import logging
        logging.getLogger(__name__).warning("DB Commit falló: %s", err)
        try:
            db.rollback()
        except Exception:
            pass
        raise
