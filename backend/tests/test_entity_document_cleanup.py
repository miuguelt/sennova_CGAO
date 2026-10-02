"""Eliminación de entidades con documentos y archivos sin pérdida transaccional."""

import os
import secrets
from datetime import date
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(40))

from app.database import Base
from app.models import Documento, Entregable, Producto, Proyecto, User
from app.routers import productos_commands


@pytest.fixture
def context(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{(tmp_path / 'eliminacion.db').as_posix()}")
    event.listen(engine, "connect", lambda connection, _: connection.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    owner = User(id=str(uuid4()), nombre="Responsable", email="responsable@example.com", password_hash="example", rol="investigador")
    project = Proyecto(id=str(uuid4()), nombre="Proyecto con productos", owner=owner)
    product = Producto(id=str(uuid4()), nombre="Producto con soportes", tipo="A1", owner=owner, proyecto=project)
    deliverable = Entregable(id=str(uuid4()), titulo="Resultado comprometido", fase="Final", fecha_entrega=date(2026, 12, 1), proyecto=project, producto=product)
    storage = tmp_path / "documentos"
    storage.mkdir()
    path = storage / "soporte.pdf"
    path.write_bytes(b"%PDF soporte del producto")
    document = Documento(id=str(uuid4()), entidad_tipo="producto", entidad_id=product.id, tipo="soporte_minciencias",
                         nombre_archivo="soporte.pdf", file_path=str(path), owner=owner)
    db.add_all([owner, project, product, deliverable, document])
    db.commit()
    monkeypatch.setattr(productos_commands, "DOCUMENT_STORAGE_DIR", storage, raising=False)
    yield db, owner, project, product, deliverable, document, storage
    db.close()
    engine.dispose()


def test_product_deletion_removes_supports_and_preserves_project_deliverable(context):
    db, owner, project, product, deliverable, document, _ = context
    path = Path(document.file_path)
    result = productos_commands.delete_producto(product.id, current_user=owner, db=db)
    assert result == {"message": "Producto eliminado"}
    assert db.query(Producto).count() == 0
    assert db.query(Documento).count() == 0
    assert db.query(Proyecto).one().id == project.id
    remaining = db.query(Entregable).one()
    assert remaining.id == deliverable.id
    assert remaining.producto_id is None
    assert remaining.proyecto_id == project.id
    assert not path.exists()


def test_product_commit_failure_preserves_entity_documents_deliverable_and_file(context):
    db, owner, _, product, deliverable, document, _ = context
    product_id, document_id, path = product.id, document.id, Path(document.file_path)
    def fail_commit(session):
        raise RuntimeError("Fallo transaccional de prueba")
    event.listen(db, "before_commit", fail_commit)
    try:
        with pytest.raises(HTTPException) as error:
            productos_commands.delete_producto(product_id, current_user=owner, db=db)
        assert error.value.status_code == 500
        assert db.query(Producto).one().id == product_id
        assert db.query(Documento).one().id == document_id
        assert db.query(Entregable).one().producto_id == product_id
        assert path.read_bytes() == b"%PDF soporte del producto"
    finally:
        event.remove(db, "before_commit", fail_commit)


def test_product_deletion_reports_pending_cleanup_and_preserves_external_file(context, tmp_path):
    db, owner, _, product, _, document, _ = context
    outside = tmp_path / "archivo_externo.pdf"
    outside.write_bytes(b"Archivo ajeno al almacenamiento")
    document.file_path = str(outside)
    document_id = document.id
    db.commit()
    result = productos_commands.delete_producto(product.id, current_user=owner, db=db)
    assert db.query(Producto).count() == 0
    assert db.query(Documento).count() == 0
    assert result["limpieza_pendiente"] is True
    assert result["documentos_pendientes_limpieza"] == [document_id]
    assert "pendientes" in result["message"]
    assert outside.read_bytes() == b"Archivo ajeno al almacenamiento"


def test_entity_document_marking_is_scoped_and_can_be_rolled_back(context):
    from app.services.entity_document_cleanup import delete_entity_documents
    db, owner, project, product, _, document, storage = context
    other = Documento(id=str(uuid4()), entidad_tipo="proyecto", entidad_id=project.id, tipo="acta_inicio", owner=owner)
    db.add(other)
    db.commit()
    documents = delete_entity_documents(db, "producto", product.id)
    assert [item.id for item in documents] == [document.id]
    assert db.query(Documento).count() == 1
    assert (storage / "soporte.pdf").exists()
    db.rollback()
    assert db.query(Documento).count() == 2
    assert (storage / "soporte.pdf").exists()


def test_cleanup_handles_legacy_basename_missing_and_inline_documents(context):
    from app.services.entity_document_cleanup import cleanup_document_files
    _, _, _, _, _, document, storage = context
    document.file_path = "ruta_anterior/documentos/soporte.pdf"
    missing = Documento(id=str(uuid4()), file_path=str(storage / "ausente.pdf"))
    inline = Documento(id=str(uuid4()), data_base64="YQ==")
    assert cleanup_document_files([document, missing, inline], storage) == []
    assert not (storage / "soporte.pdf").exists()


def test_cleanup_reports_unlink_failure_without_hiding_it(context, monkeypatch):
    from app.services.entity_document_cleanup import cleanup_document_files
    _, _, _, _, _, document, storage = context
    original_unlink = Path.unlink
    def fail_unlink(path, *args, **kwargs):
        if path.name == "soporte.pdf":
            raise PermissionError("Archivo ocupado")
        return original_unlink(path, *args, **kwargs)
    monkeypatch.setattr(Path, "unlink", fail_unlink)
    assert cleanup_document_files([document], storage) == [document.id]
    assert (storage / "soporte.pdf").exists()


def test_cleanup_defaults_to_configured_document_storage(context, monkeypatch):
    from types import SimpleNamespace
    from app.services import entity_document_cleanup
    _, _, _, _, _, document, storage = context
    monkeypatch.setattr(entity_document_cleanup, "get_settings", lambda: SimpleNamespace(STORAGE_DIR=str(storage.parent)))
    assert entity_document_cleanup.cleanup_document_files([document]) == []
    assert not (storage / "soporte.pdf").exists()


def test_product_deletion_denied_for_unrelated_user_preserves_documents(context):
    db, _, _, product, _, document, storage = context
    stranger = User(id=str(uuid4()), nombre="Otro investigador", email="otro@example.com", password_hash="example", rol="investigador")
    db.add(stranger)
    db.commit()
    with pytest.raises(HTTPException) as error:
        productos_commands.delete_producto(product.id, current_user=stranger, db=db)
    assert error.value.status_code == 403
    assert db.query(Producto).count() == 1
    assert db.query(Documento).one().id == document.id
    assert (storage / "soporte.pdf").exists()


def test_cleanup_reports_corrupt_legacy_path_as_pending(context):
    from app.services.entity_document_cleanup import cleanup_document_files
    db, _, _, _, _, document, storage = context
    document.file_path = "ruta\x00invalida.pdf"
    db.commit()
    assert cleanup_document_files([document], storage) == [document.id]
    assert (storage / "soporte.pdf").exists()
