"""Contrato del expediente: seis etapas, archivos reales y cierre verificable."""

import base64
import io
import json
import os
import secrets
import uuid
from datetime import date
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(48))

from app.models import Base, Documento, Proyecto, User, Producto, Entregable, Grupo, Semillero, Notificacion, Actividad
from app.auth import get_current_user
from app.database import get_db
from app.main import app


@pytest.fixture
def evidence_context(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    owner = User(email="expediente@example.com", nombre="Investigadora", password_hash="example", rol="investigador")
    db.add(owner)
    db.flush()
    project = Proyecto(nombre="Proyecto de organización documental", codigo_sgps="CAP-05-2026", owner_id=owner.id, vigencia=4, estado="En ejecución", presupuesto_total=1000, tipologia="Red")
    db.add(project)
    db.commit()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: owner
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "STORAGE_DIR", str(tmp_path))
    yield db, owner, project, tmp_path, TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()
    db.close()
    engine.dispose()


def add_document(ctx, kind, name="soporte.pdf", *, content=b"contenido real", periodo=None, entity=None):
    db, owner, project, root, _ = ctx
    (root / "documentos").mkdir(exist_ok=True)
    path = root / "documentos" / (str(uuid.uuid4()) + ".pdf")
    if content is not None:
        path.write_bytes(content)
    doc = Documento(entidad_tipo="producto" if entity else "proyecto", entidad_id=entity or project.id, tipo=kind, nombre_archivo=name, owner_id=owner.id, content_type="application/pdf", file_path=str(path), periodo_bimestre=periodo)
    db.add(doc)
    db.commit()
    return doc


def complete_file(ctx):
    for kind in ("formulacion_proyecto", "acta_inicio", "producto_resultado", "acta_cierre", "informe_final", "evidencia_fotografica"):
        add_document(ctx, kind)
    for period in (1, 2):
        add_document(ctx, "informe_bimensual", periodo=period)


def test_empty_project_has_exact_six_stages_and_actionable_missing_items(evidence_context):
    *_, client = evidence_context
    project = evidence_context[2]
    res = client.get(f"/proyectos/{project.id}/expediente")
    assert res.status_code == 200
    data = res.json()
    assert [s["carpeta"] for s in data["etapas"]] == [
        "1ProyectoFomulado", "2ActadeInicio", "3Productos", "4InformesBimensuales",
        "5ActaCierre", "6EvidenciasFotograficas", "7Borradoresyvarios"
    ]
    assert data["completo"] is False
    assert data["porcentaje_completitud"] == 0
    assert all(s["guia"] and (s["faltantes"] or s["id"] == "borradores") for s in data["etapas"])
    assert data["etapas"][3]["bimestres_pendientes"] == [1, 2]


def test_real_files_complete_stages_and_zip_preserves_them(evidence_context):
    complete_file(evidence_context)
    _, _, project, _, client = evidence_context
    data = client.get(f"/proyectos/{project.id}/expediente").json()
    assert data["completo"] is True
    assert data["porcentaje_completitud"] == 100
    res = client.get(f"/proyectos/{project.id}/expediente/descargar")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    with ZipFile(io.BytesIO(res.content)) as archive:
        assert all(s["carpeta"] + "/" in archive.namelist() for s in data["etapas"])
        manifest = json.loads(archive.read("expediente.json"))
        assert manifest["completo"] is True
        files = [n for n in archive.namelist() if n.endswith(".pdf")]
        assert len(files) == 8 and len(files) == len(set(files))
        assert all(archive.read(n) == b"contenido real" for n in files)


def test_missing_empty_or_invalid_base64_is_not_documentary_completion(evidence_context):
    ctx = evidence_context
    add_document(ctx, "acta_inicio", content=None)
    empty = add_document(ctx, "formulacion_proyecto", content=b"")
    empty.file_path = None
    empty.data_base64 = "%%%%"
    ctx[0].commit()
    data = ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()
    assert data["porcentaje_completitud"] == 0
    assert data["etapas"][0]["documentos"][0]["disponible"] is False
    assert data["etapas"][1]["documentos"][0]["disponible"] is False
    empty.data_base64 = base64.b64encode(b"base64 heredado").decode()
    ctx[0].commit()
    assert ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()["etapas"][0]["completo"] is True


def test_report_duplicates_and_legacy_reports_do_not_cover_other_bimestres(evidence_context):
    for period in (1, 1, None):
        add_document(evidence_context, "informe_bimensual", periodo=period)
    data = evidence_context[-1].get(f"/proyectos/{evidence_context[2].id}/expediente").json()
    assert data["etapas"][3]["completo"] is False
    assert data["etapas"][3]["bimestres_pendientes"] == [2]
    evidence_context[2].vigencia = None
    evidence_context[0].commit()
    stage = evidence_context[-1].get(f"/proyectos/{evidence_context[2].id}/expediente").json()["etapas"][3]
    assert stage["informes_esperados"] is None
    assert stage["completo"] is False


def test_linked_product_supports_are_required_and_exported(evidence_context):
    db, owner, project, _, client = evidence_context
    product = Producto(nombre="Resultado archivístico", tipo="C1", owner_id=owner.id, proyecto_id=project.id, is_verificado=True)
    db.add(product)
    db.commit()
    add_document(evidence_context, "producto_resultado")
    assert client.get(f"/proyectos/{project.id}/expediente").json()["etapas"][2]["completo"] is False
    add_document(evidence_context, "soporte_minciencias", entity=product.id)
    data = client.get(f"/proyectos/{project.id}/expediente").json()
    assert data["etapas"][2]["completo"] is True
    with ZipFile(io.BytesIO(client.get(f"/proyectos/{project.id}/expediente/descargar").content)) as archive:
        assert any(n.startswith("3Productos/") and n.endswith(".pdf") for n in archive.namelist())


def test_partial_zip_sanitizes_names_and_reports_unclassified_documents(evidence_context):
    add_document(evidence_context, "otro", name="../../archivo.pdf")
    add_document(evidence_context, "acta_inicio", content=None)
    ctx = evidence_context
    with ZipFile(io.BytesIO(ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente/descargar").content)) as archive:
        assert "pendientes.txt" in archive.namelist()
        assert all(".." not in n and not n.startswith("/") for n in archive.namelist())
        assert any("Anexos/" in n for n in archive.namelist())
        assert "acta" in archive.read("pendientes.txt").decode().lower()


def test_project_access_and_missing_project(evidence_context):
    db, _, project, _, client = evidence_context
    outsider = User(email="fuera@example.com", nombre="Otro", password_hash="example", rol="aprendiz")
    db.add(outsider)
    db.commit()
    app.dependency_overrides[get_current_user] = lambda: outsider
    for suffix in ("expediente", "expediente/descargar"):
        assert client.get(f"/proyectos/{project.id}/{suffix}").status_code == 403
        assert client.get(f"/proyectos/{uuid.uuid4()}/{suffix}").status_code == 404


def test_finalization_requires_documentary_file_even_if_old_five_checks_pass(evidence_context):
    from app.services.proyectos_service import evaluar_requisitos_liquidacion, evaluar_y_auto_finalizar_proyecto
    db, owner, project, _, _ = evidence_context
    product = Producto(nombre="Producto verificado", tipo="C1", owner_id=owner.id, proyecto_id=project.id, is_verificado=True)
    db.add(product)
    db.add(Entregable(proyecto_id=project.id, fase="Final", titulo="Resultado", estado="aprobado", fecha_entrega=date(2026, 10, 1)))
    db.commit()
    add_document(evidence_context, "informe_final")
    assert evaluar_requisitos_liquidacion(project, db)["can_liquidate"] is False
    assert evaluar_y_auto_finalizar_proyecto(project.id, db)["auto_finalizado"] is False
    complete_file(evidence_context)
    add_document(evidence_context, "soporte_minciencias", entity=product.id)
    assert evaluar_requisitos_liquidacion(project, db)["can_liquidate"] is True
    assert evaluar_y_auto_finalizar_proyecto(project.id, db)["auto_finalizado"] is True
    assert project.estado == "Finalizado"
    doc = db.query(Documento).filter_by(tipo="acta_inicio").first()
    db.delete(doc)
    db.commit()
    assert evaluar_y_auto_finalizar_proyecto(project.id, db)["porcentaje"] < 100


def test_document_period_migration_is_idempotent_and_preserves_existing_data():
    from app.database import ensure_document_period_column
    engine = create_engine("sqlite://")
    assert ensure_document_period_column(engine) is False
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE documentos (id INTEGER PRIMARY KEY, nombre_archivo TEXT)"))
        conn.execute(text("INSERT INTO documentos VALUES (1, 'informe.docx')"))
    assert ensure_document_period_column(engine) is True
    assert ensure_document_period_column(engine) is False
    assert "periodo_bimestre" in {c["name"] for c in inspect(engine).get_columns("documentos")}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT nombre_archivo, periodo_bimestre FROM documentos")).one() == ("informe.docx", None)
    engine.dispose()


def test_finalization_transaction_rolls_back_state_activity_and_notifications(evidence_context):
    from app.services.proyectos_service import evaluar_y_auto_finalizar_proyecto
    db, owner, project, _, _ = evidence_context
    product = Producto(nombre="Resultado", tipo="C1", owner_id=owner.id, proyecto_id=project.id, is_verificado=True)
    db.add(product)
    db.add(Entregable(proyecto_id=project.id, titulo="Cierre", fase="Final", estado="aprobado", fecha_entrega=date(2026, 10, 1)))
    db.commit()
    complete_file(evidence_context)
    add_document(evidence_context, "soporte_minciencias", entity=product.id)
    db.execute(text("CREATE TRIGGER reject_notification BEFORE INSERT ON notificaciones BEGIN SELECT RAISE(ABORT, 'rechazo de prueba'); END"))
    db.commit()
    with pytest.raises(Exception):
        evaluar_y_auto_finalizar_proyecto(project.id, db)
    db.expire_all()
    assert project.estado == "En ejecución"
    assert db.query(Actividad).filter_by(tipo_accion="auto_finalizar_proyecto").count() == 0
    assert db.query(Notificacion).count() == 0


def test_project_group_is_never_assigned_arbitrarily_and_invalid_links_are_rejected(evidence_context):
    db, owner, _, _, client = evidence_context
    db.execute(text("DROP INDEX IF EXISTS uq_grupos_singleton"))
    first = Grupo(nombre="SEMIPROVEL", owner_id=owner.id)
    second = Grupo(nombre="SIADM", owner_id=owner.id)
    db.add_all([first, second])
    db.flush()
    semillero = Semillero(nombre="Semillero administrativo", grupo_id=second.id, owner_id=owner.id)
    db.add(semillero)
    db.commit()
    basic = {"nombre": "Nuevo proyecto sin atribución"}
    created = client.post("/proyectos", json=basic)
    assert created.status_code == 201
    assert created.json()["grupo_id"] is None
    assert client.post("/proyectos", json={**basic, "grupo_id": str(uuid.uuid4())}).status_code == 404
    assert client.post("/proyectos", json={**basic, "semillero_id": str(semillero.id), "grupo_id": str(first.id)}).status_code == 422
    inherited = client.post("/proyectos", json={**basic, "semillero_id": str(semillero.id)})
    assert inherited.status_code == 201
    assert inherited.json()["grupo_id"] == str(second.id)
    assert client.put(f"/proyectos/{inherited.json()['id']}", json={"grupo_id": str(first.id)}).status_code == 422
    assert client.put(f"/proyectos/{inherited.json()['id']}", json={"convocatoria_id": str(uuid.uuid4())}).status_code == 404


def test_project_cannot_be_created_finalized_without_documentation(evidence_context):
    client = evidence_context[-1]
    response = client.post("/proyectos", json={"nombre": "Proyecto sin expediente", "estado": "Finalizado"})
    assert response.status_code == 400
    assert evidence_context[0].query(Proyecto).count() == 1


def test_delete_project_removes_document_records_after_commit_and_preserves_products(evidence_context):
    db, owner, project, _, client = evidence_context
    doc = add_document(evidence_context, "acta_inicio")
    product = Producto(nombre="Resultado conservado", tipo="C1", owner_id=owner.id, proyecto_id=project.id)
    db.add(product)
    db.commit()
    document_id, product_id, path = doc.id, product.id, doc.file_path
    response = client.delete(f"/proyectos/{project.id}")
    assert response.status_code == 200
    assert db.get(Documento, document_id) is None
    from pathlib import Path
    assert not Path(path).exists()
    assert db.get(Producto, product_id).proyecto_id is None


def test_delete_project_rollback_keeps_its_documents_and_files(evidence_context):
    db, _, project, _, client = evidence_context
    doc = add_document(evidence_context, "acta_inicio")
    db.execute(text("CREATE TRIGGER reject_project_delete BEFORE DELETE ON proyectos BEGIN SELECT RAISE(ABORT, 'rechazo de prueba'); END"))
    db.commit()
    response = client.delete(f"/proyectos/{project.id}")
    assert response.status_code == 503
    assert db.get(Documento, doc.id) is not None
    from pathlib import Path
    assert Path(doc.file_path).exists()


def test_finalization_checks_the_new_budget_and_rolls_back_invalid_update(evidence_context):
    db, owner, project, _, client = evidence_context
    product = Producto(nombre="Resultado", tipo="C1", owner_id=owner.id, proyecto_id=project.id, is_verificado=True)
    db.add(product)
    db.add(Entregable(proyecto_id=project.id, fase="Final", titulo="Cierre", estado="aprobado", fecha_entrega=date(2026, 10, 1)))
    db.commit()
    complete_file(evidence_context)
    add_document(evidence_context, "soporte_minciencias", entity=product.id)
    response = client.put(f"/proyectos/{project.id}", json={"estado": "Finalizado", "presupuesto_total": 0})
    assert response.status_code == 400
    db.expire_all()
    assert project.estado == "En ejecución"
    assert project.presupuesto_total == 1000
    valid = client.put(f"/proyectos/{project.id}", json={"estado": "finalizado"})
    assert valid.status_code == 200
    assert valid.json()["estado"] == "Finalizado"


def test_reading_closure_requirements_does_not_modify_project_state(evidence_context):
    db, owner, project, _, client = evidence_context
    product = Producto(nombre="Resultado", tipo="C1", owner_id=owner.id, proyecto_id=project.id, is_verificado=True)
    db.add(product)
    db.add(Entregable(proyecto_id=project.id, fase="Final", titulo="Cierre", estado="aprobado", fecha_entrega=date(2026, 10, 1)))
    db.commit()
    complete_file(evidence_context)
    add_document(evidence_context, "soporte_minciencias", entity=product.id)
    response = client.get(f"/proyectos/{project.id}/liquidar/check")
    assert response.status_code == 200
    assert response.json()["can_liquidate"] is True
    assert response.json()["auto_finalizado"] is False
    assert project.estado == "En ejecución"
    assert db.query(Notificacion).count() == 0
