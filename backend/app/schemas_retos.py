from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RetoBase(BaseModel):
    titulo: str
    descripcion: str
    sector_productivo: Optional[str] = None
    empresa_solicitante: Optional[str] = None
    contacto_email: Optional[str] = None
    estado: str = "abierto"
    prioridad: str = "media"


class RetoCreate(RetoBase):
    pass


class RetoUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    sector_productivo: Optional[str] = None
    empresa_solicitante: Optional[str] = None
    contacto_email: Optional[str] = None
    estado: Optional[str] = None
    prioridad: Optional[str] = None
    semillero_asignado_id: Optional[UUID] = None


class RetoResponse(RetoBase):
    id: UUID
    owner_id: UUID
    semillero_asignado_id: Optional[UUID] = None
    semillero_nombre: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
