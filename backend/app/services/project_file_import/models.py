"""Procedencia de originales importados y carpetas del expediente."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.documentation_models import structured_data
from app.models import Base, Documento, Proyecto, get_uuid_column


class ProjectFileBatch(Base):
    __tablename__ = "project_file_batches"
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    proyecto_id = get_uuid_column(ForeignKey("proyectos.id", ondelete="CASCADE"), nullable=False, index=True)
    carpetas = Column(structured_data, nullable=False, default=list)
    created_by = get_uuid_column(ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    proyecto = relationship("Proyecto", back_populates="cargas_archivos")
    archivos = relationship("ProjectImportedFile", back_populates="lote", cascade="all, delete-orphan")


class ProjectImportedFile(Base):
    __tablename__ = "project_imported_files"
    documento_id = get_uuid_column(ForeignKey("documentos.id", ondelete="CASCADE"), primary_key=True)
    lote_id = get_uuid_column(ForeignKey("project_file_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    ruta = Column(String(1024), nullable=False)
    sha256 = Column(String(64), nullable=False)
    texto_extraido = Column(Text, nullable=False, default="")
    propuesta = Column(structured_data, nullable=False, default=dict)
    documento = relationship("Documento", back_populates="importacion")
    lote = relationship("ProjectFileBatch", back_populates="archivos")


Proyecto.cargas_archivos = relationship("ProjectFileBatch", back_populates="proyecto", cascade="all, delete-orphan")
Documento.importacion = relationship("ProjectImportedFile", back_populates="documento", uselist=False, cascade="all, delete-orphan")
