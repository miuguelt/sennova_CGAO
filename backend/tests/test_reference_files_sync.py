# -*- coding: utf-8 -*-
"""Pruebas de sincronización de archivos de referencia institucional."""

import secrets
import os
from pathlib import Path
from uuid import uuid4
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(40))

from app.database import Base
from app.models import Documento, Proyecto, User
from app.services.reference_files_sync import _determine_document_type, sync_reference_project_files


def test_determine_document_type_covers_all_stages():
    """Valida la clasificación de archivos según la estructura de SharePoint."""
    doc_type, per = _determine_document_type("1ProyectoFomulado/Presentacion.pptx", "Presentacion.pptx")
    assert doc_type == "presentacion_proyecto"
    assert per is None

    doc_type, per = _determine_document_type("1ProyectoFomulado/Proyecto.docx", "Proyecto.docx")
    assert doc_type == "formulacion_proyecto"

    doc_type, per = _determine_document_type("2ActadeInicio/Acta.docx", "Acta.docx")
    assert doc_type == "acta_inicio"

    doc_type, per = _determine_document_type("3Productos/Poster.pptx", "Poster.pptx")
    assert doc_type == "poster_producto"

    doc_type, per = _determine_document_type("3Productos/Informe.docx", "Informe.docx")
    assert doc_type == "producto_resultado"

    doc_type, per = _determine_document_type("3Productos/Certificacion.pdf", "Certificacion.pdf")
    assert doc_type == "soporte_minciencias"

    doc_type, per = _determine_document_type("4InformesBimensuales/Informe.docx", "Informe.docx")
    assert doc_type == "informe_bimensual"
    assert per == 1

    doc_type, per = _determine_document_type("5ActaCierre/Acta.docx", "Acta.docx")
    assert doc_type == "acta_cierre"

    doc_type, per = _determine_document_type("5ActaCierre/Informe_Final.docx", "Informe_Final.docx")
    assert doc_type == "informe_final"

    doc_type, per = _determine_document_type("6EvidenciasFotograficas/foto.jpg", "foto.jpg")
    assert doc_type == "evidencia_fotografica"

    doc_type, per = _determine_document_type("6EvidenciasFotograficas/video.mp4", "video.mp4")
    assert doc_type == "evidencia_video"

    doc_type, per = _determine_document_type("7Borradoresyvarios/nota.docx", "nota.docx")
    assert doc_type == "borrador_varios"

    doc_type, per = _determine_document_type("raiz/GCDTP-F-023.docx", "GCDTP-F-023.docx")
    assert doc_type == "informe_final"

    doc_type, per = _determine_document_type("desconocido/archivo.txt", "archivo.txt")
    assert doc_type == "borrador_varios"


def test_sync_reference_project_files_executes_idempotently(tmp_path, monkeypatch):
    """Verifica que la sincronización cree registros y copie archivos sin duplicar."""
    engine = create_engine(f"sqlite:///{(tmp_path / 'sync_test.db').as_posix()}")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    owner = User(id=str(uuid4()), nombre="Admin", email="admin@test.com", password_hash="hash", rol="admin")
    project = Proyecto(
        id=str(uuid4()),
        nombre="CAP-14-2026 Sistema de información para la gestión de proyectos de investigación del CGAO",
        owner=owner,
    )
    db.add_all([owner, project])
    db.commit()

    storage = tmp_path / "storage"
    storage.mkdir()

    class MockSettings:
        STORAGE_DIR = str(storage)

    monkeypatch.setattr("app.services.reference_files_sync.get_settings", lambda: MockSettings())

    result = sync_reference_project_files(db)
    assert isinstance(result, dict)
    assert "proyectos_afectados" in result
    assert "documentos_sincronizados" in result

    # Segunda ejecución no duplica
    result2 = sync_reference_project_files(db)
    assert result2["documentos_sincronizados"] == 0

    db.close()
    engine.dispose()
