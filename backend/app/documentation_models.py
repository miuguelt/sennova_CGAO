"""Datos de autoría y versiones inmutables vinculados al expediente existente."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, Integer, JSON, String, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models import Base, Documento, Proyecto, get_uuid_column

structured_data = JSON().with_variant(JSONB(), "postgresql")


class ProjectDocumentation(Base):
    __tablename__ = "project_documentation"
    proyecto_id = get_uuid_column(ForeignKey("proyectos.id", ondelete="CASCADE"), primary_key=True)
    revision = Column(Integer, nullable=False, default=0)
    datos = Column(structured_data, nullable=False, default=dict)
    fuente_snapshot = Column(structured_data, nullable=True)
    updated_by = get_uuid_column(ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    proyecto = relationship("Proyecto", back_populates="documentacion")
    __table_args__ = (CheckConstraint("revision >= 0", name="ck_documentation_revision"),)


class ProjectDocumentDraft(Base):
    __tablename__ = "project_document_drafts"
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    proyecto_id = get_uuid_column(ForeignKey("proyectos.id", ondelete="CASCADE"), nullable=False)
    clave = Column(String(120), nullable=False)
    tipo = Column(String(50), nullable=False)
    periodo_bimestre = Column(Integer)
    producto_id = get_uuid_column(ForeignKey("productos.id", ondelete="SET NULL"))
    revision = Column(Integer, nullable=False, default=0)
    datos = Column(structured_data, nullable=False, default=dict)
    updated_by = get_uuid_column(ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    proyecto = relationship("Proyecto", back_populates="borradores_documentales")
    versiones = relationship("ProjectDocumentVersion", back_populates="borrador", cascade="all, delete-orphan")
    __table_args__ = (
        UniqueConstraint("proyecto_id", "clave", name="uq_project_document_draft_key"),
        CheckConstraint("revision >= 0", name="ck_document_draft_revision"),
    )


class ProjectDocumentVersion(Base):
    __tablename__ = "project_document_versions"
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    borrador_id = get_uuid_column(ForeignKey("project_document_drafts.id", ondelete="CASCADE"), nullable=False)
    documento_id = get_uuid_column(ForeignKey("documentos.id", ondelete="SET NULL"), nullable=True, unique=True)
    version = Column(Integer, nullable=False)
    revision_comunes = Column(Integer, nullable=False)
    revision_borrador = Column(Integer, nullable=False)
    snapshot = Column(structured_data, nullable=False)
    sha256 = Column(String(64), nullable=False)
    estado = Column(String(20), nullable=False, default="borrador")
    created_by = get_uuid_column(ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    reviewed_by = get_uuid_column(ForeignKey("users.id"))
    reviewed_at = Column(DateTime)
    observacion_revision = Column(String(2000))
    borrador = relationship("ProjectDocumentDraft", back_populates="versiones")
    documento = relationship("Documento", back_populates="version_generada")
    __table_args__ = (
        UniqueConstraint("borrador_id", "version", name="uq_document_draft_version"),
        CheckConstraint("version >= 1", name="ck_document_version_positive"),
        CheckConstraint("estado IN ('borrador', 'revisado')", name="ck_document_version_state"),
    )


Proyecto.documentacion = relationship("ProjectDocumentation", back_populates="proyecto", uselist=False, cascade="all, delete-orphan")
Proyecto.borradores_documentales = relationship("ProjectDocumentDraft", back_populates="proyecto", cascade="all, delete-orphan")
Documento.version_generada = relationship("ProjectDocumentVersion", back_populates="documento", uselist=False)
