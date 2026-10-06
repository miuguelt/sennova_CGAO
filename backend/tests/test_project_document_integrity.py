"""Integridad del expediente: acceso, persistencia y recuperación de archivos."""

import asyncio
import base64
import io
import os
import secrets
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from starlette.datastructures import Headers

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(40))

from app.database import Base, get_db
from app.auth import get_current_user
from app.models import Documento, Producto, Proyecto, User
from app.routers import documentos as router
from app.schemas import DocumentoCreate


@pytest.fixture
def context(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{(tmp_path / 'integridad.db').as_posix()}", connect_args={"check_same_thread": False})
    event.listen(engine, "connect", lambda connection, _: connection.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    owner = User(id=str(uuid4()), nombre="Responsable", email="responsable@example.com", password_hash="example", rol="investigador")
    stranger = User(id=str(uuid4()), nombre="Participante", email="participante@example.com", password_hash="example", rol="usuario")
    project = Proyecto(id=str(uuid4()), nombre="Proyecto con expediente", owner=owner, estado="En ejecución")
    product = Producto(id=str(uuid4()), nombre="Producto verificable", tipo="A1", owner=owner, proyecto=project)
    db.add_all([owner, stranger, project, product])
    db.commit()
    storage = tmp_path / "documentos"
    storage.mkdir()
    monkeypatch.setattr(router, "STORAGE_DIR", storage)
    yield db, owner, stranger, project, product, storage
    db.close()
    engine.dispose()


def create(context, *, entity="proyecto", target=None, user=None, payload=b"%PDF-1.4 evidencia", filename="evidencia.pdf", encoded=None, tipo="acta_inicio", period=None):
    db, owner, _, project, _, _ = context
    return router.create_documento_base64(
        DocumentoCreate(entidad_tipo=entity, entidad_id=target or project.id, tipo=tipo,
                        periodo_bimestre=period, nombre_archivo=filename, data_base64=encoded if encoded is not None else base64.b64encode(payload).decode()),
        current_user=user or owner, db=db,
    )


def upload(context, *, entity="proyecto", target=None, user=None, payload=b"%PDF-1.4 evidencia", mime="application/pdf", filename="evidencia.pdf", tipo="acta_inicio", period=None):
    db, owner, _, project, _, _ = context
    file = UploadFile(file=io.BytesIO(payload), filename=filename, headers=Headers({"content-type": mime}))
    return asyncio.run(router.upload_documento(
        entidad_tipo=entity, entidad_id=target or project.id, tipo=tipo, descripcion="  Evidencia registrada  ",
        periodo_bimestre=period, file=file, current_user=user or owner, db=db,
    ))


@pytest.mark.parametrize("operation", [create, upload])
@pytest.mark.parametrize("entity", ["proyecto", "producto", "user"])
def test_given_missing_target_when_upload_then_no_record_or_file(context, operation, entity):
    db, _, _, _, _, storage = context
    with pytest.raises(HTTPException) as error:
        operation(context, entity=entity, target=str(uuid4()))
    assert error.value.status_code == 404
    assert db.query(Documento).count() == 0
    assert list(storage.iterdir()) == []


@pytest.mark.parametrize("operation", [create, upload])
@pytest.mark.parametrize("entity", ["proyecto", "producto", "user"])
def test_given_unrelated_user_when_upload_then_access_denied(context, operation, entity):
    db, owner, stranger, project, product, storage = context
    target = {"proyecto": project.id, "producto": product.id, "user": owner.id}[entity]
    with pytest.raises(HTTPException) as error:
        operation(context, entity=entity, target=target, user=stranger)
    assert error.value.status_code == 403
    assert db.query(Documento).count() == 0
    assert not list(storage.iterdir())


@pytest.mark.parametrize("operation", [create, upload])
@pytest.mark.parametrize("entity", ["general", "formato", "plantilla"])
def test_public_resources_preserve_existing_access(context, operation, entity):
    db, owner, stranger, _, _, _ = context
    document = operation(context, entity=entity, target=owner.id)
    assert router.get_documento(document.id, current_user=stranger, db=db).id == document.id
    assert Path(document.file_path).read_bytes().startswith(b"%PDF")


@pytest.mark.parametrize("operation", [create, upload])
def test_retired_bitacora_attachment_type_is_rejected(context, operation):
    with pytest.raises(HTTPException) as error:
        operation(context, tipo="evidencia_bitacora")
    assert error.value.status_code == 422
    assert "ya no está disponible" in error.value.detail
    assert context[0].query(Documento).count() == 0
    assert list(context[-1].iterdir()) == []


@pytest.mark.parametrize("encoded,filename", [("%%%%", "evidencia.pdf"), ("", "evidencia.pdf"), ("YQ==", "archivo.exe")])
def test_base64_rejects_invalid_empty_or_unsupported_content(context, encoded, filename):
    with pytest.raises(HTTPException) as error:
        create(context, encoded=encoded, filename=filename)
    assert error.value.status_code == 400
    assert context[0].query(Documento).count() == 0
    assert not list(context[-1].iterdir())


@pytest.mark.parametrize("operation", [create, upload])
def test_upload_rejects_empty_and_oversized_files(context, operation, monkeypatch):
    monkeypatch.setattr(router, "MAX_FILE_SIZE", 10)
    for payload in [b"", b"a" * 11]:
        with pytest.raises(HTTPException) as error:
            operation(context, payload=payload)
        assert error.value.status_code == 400
    assert context[0].query(Documento).count() == 0
    assert not list(context[-1].iterdir())


@pytest.mark.parametrize("operation", [create, upload])
def test_commit_failure_keeps_database_and_storage_clean(context, operation):
    db, _, _, _, _, storage = context
    def fail_commit(session):
        raise RuntimeError("Fallo transaccional de prueba")
    event.listen(db, "before_commit", fail_commit)
    try:
        with pytest.raises(HTTPException) as error:
            operation(context)
        assert error.value.status_code == 500
        assert "Fallo transaccional" not in error.value.detail
        assert db.query(Documento).count() == 0
        assert list(storage.iterdir()) == []
    finally:
        event.remove(db, "before_commit", fail_commit)


def test_delete_commit_failure_preserves_original_file_and_record(context):
    db, owner, _, _, _, _ = context
    document = create(context)
    document_id, path = document.id, Path(document.file_path)
    def fail_commit(session):
        raise RuntimeError("Fallo transaccional de prueba")
    event.listen(db, "before_commit", fail_commit)
    try:
        with pytest.raises(HTTPException) as error:
            router.delete_documento(document_id, current_user=owner, db=db)
        assert error.value.status_code == 500
        assert db.query(Documento).filter_by(id=document_id).one().id == document_id
        assert path.read_bytes().startswith(b"%PDF")
    finally:
        event.remove(db, "before_commit", fail_commit)


def test_delete_success_removes_persisted_document_and_file(context):
    db, owner, _, _, _, _ = context
    document = create(context)
    path = Path(document.file_path)
    result = router.delete_documento(document.id, current_user=owner, db=db)
    assert result == {"message": "Documento eliminado"}
    assert db.query(Documento).count() == 0
    assert not path.exists()


@pytest.mark.parametrize("operation", [create, upload])
def test_mp4_evidence_preserves_media_type_and_bytes(context, operation):
    payload = b"\x00\x00\x00\x18ftypmp42 evidencia"
    kwargs = {"mime": "video/mp4"} if operation is upload else {}
    document = operation(context, payload=payload, filename="evidencia.mp4", tipo="evidencia_fotografica", **kwargs)
    assert document.content_type == "video/mp4"
    assert Path(document.file_path).read_bytes() == payload


@pytest.mark.parametrize("operation", [create, upload])
@pytest.mark.parametrize("entity", ["proyecto", "producto"])
def test_all_project_evidence_triggers_completion_evaluation(context, operation, entity, monkeypatch):
    db, _, _, project, product, _ = context
    evaluated = []
    monkeypatch.setattr(router, "evaluar_y_auto_finalizar_proyecto", lambda project_id, session: evaluated.append((project_id, session.query(Documento).count())))
    document = operation(context, entity=entity, target=project.id if entity == "proyecto" else product.id, tipo="soporte_minciencias")
    assert evaluated == [(project.id, 1)]
    assert document.entidad_tipo == entity


@pytest.mark.parametrize("operation", [create, upload])
@pytest.mark.parametrize("period", [None, 0, -1, 4])
def test_bimonthly_report_requires_valid_project_period(context, operation, period):
    context[3].vigencia = 5
    context[0].commit()
    with pytest.raises((HTTPException, ValidationError)) as error:
        operation(context, tipo="informe_bimensual", period=period)
    if isinstance(error.value, HTTPException):
        assert error.value.status_code == 422
    else:
        assert error.value.errors()[0]["loc"] == ("periodo_bimestre",)
    assert context[0].query(Documento).count() == 0
    assert not list(context[-1].iterdir())


def test_http_period_validation_and_file_download(context):
    db, owner, _, project, _, storage = context
    application = FastAPI()
    application.include_router(router.router)
    application.dependency_overrides[get_current_user] = lambda: owner
    application.dependency_overrides[get_db] = lambda: db
    project.vigencia = 5
    db.commit()
    payload = {"entidad_tipo": "proyecto", "entidad_id": project.id, "tipo": "informe_bimensual",
               "nombre_archivo": "informe.pdf", "data_base64": base64.b64encode(b"%PDF informe").decode()}
    with TestClient(application) as client:
        for period in [None, 0, -1, 4]:
            response = client.post("/documentos", json={**payload, "periodo_bimestre": period})
            assert response.status_code == 422
        assert db.query(Documento).count() == 0
        assert not list(storage.iterdir())
        response = client.post("/documentos", json={**payload, "periodo_bimestre": 3})
        assert response.status_code == 201, response.text
        assert response.json()["periodo_bimestre"] == 3
        downloaded = client.get(f"/documentos/{response.json()['id']}/download")
        assert downloaded.status_code == 200
        assert base64.b64decode(downloaded.json()["data_base64"]) == b"%PDF informe"
        multipart = client.post("/documentos/upload", data={"entidad_tipo": "proyecto", "entidad_id": project.id,
                              "tipo": "informe_bimestral", "periodo_bimestre": 2},
                              files={"file": ("periodo2.pdf", b"%PDF segundo", "application/pdf")})
        assert multipart.status_code == 201, multipart.text
        assert multipart.json()["periodo_bimestre"] == 2


@pytest.mark.parametrize("operation", [create, upload])
@pytest.mark.parametrize("tipo", ["informe_bimensual", "informe_bimestral"])
def test_bimonthly_report_records_final_partial_period(context, operation, tipo):
    context[3].vigencia = 5
    context[0].commit()
    document = operation(context, tipo=tipo, period=3)
    assert document.periodo_bimestre == 3
    assert context[0].query(Documento).one().periodo_bimestre == 3


@pytest.mark.parametrize("operation", [create, upload])
def test_bimonthly_report_must_belong_to_project(context, operation):
    with pytest.raises(HTTPException) as error:
        operation(context, entity="producto", target=context[4].id, tipo="informe_bimensual", period=1)
    assert error.value.status_code == 422
    assert context[0].query(Documento).count() == 0


@pytest.mark.parametrize("operation", [create, upload])
def test_write_failure_does_not_create_document_record(context, operation, monkeypatch):
    monkeypatch.setattr(router, "STORAGE_DIR", context[-1] / "inexistente")
    with pytest.raises(HTTPException) as error:
        operation(context)
    assert error.value.status_code == 500
    assert context[0].query(Documento).count() == 0
    assert not list(context[-1].iterdir())


def test_project_team_can_read_product_support_documents(context):
    db, owner, member, project, product, _ = context
    document = create(context, entity="producto", target=product.id, tipo="soporte_minciencias")
    project.equipo.append(member)
    db.commit()
    assert router.get_documento(document.id, current_user=member, db=db).id == document.id
    assert document.id in [item.id for item in router.list_documentos(entidad_tipo="producto", current_user=member, db=db)]
    downloaded = router.download_documento(document.id, current_user=member, db=db)
    assert base64.b64decode(downloaded["data_base64"]).startswith(b"%PDF")


def test_multipart_rejects_malformed_target_identifier(context):
    with pytest.raises(HTTPException) as error:
        upload(context, target="identificador-invalido")
    assert error.value.status_code == 422
    assert context[0].query(Documento).count() == 0
    assert not list(context[-1].iterdir())


def test_multipart_normalizes_uuid_before_persisting_target(context):
    document = upload(context, target=context[3].id.replace("-", ""))
    assert document.entidad_id == context[3].id
