"""Formularios persistidos y documentos reales del expediente del proyecto."""

import io
import os
import secrets
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(48))

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.main import app
from app.models import Base, Documento, Producto, Proyecto, User


@pytest.fixture
def documentation_context(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    db = factory()
    from app.middlewares import audit
    monkeypatch.setattr(audit, "SessionLocal", factory)
    user = User(email="documentacion@example.com", nombre="Investigadora de ejemplo", password_hash="example", rol="investigador")
    db.add(user)
    db.flush()
    project = Proyecto(nombre="Fortalecimiento de la organización documental", codigo_sgps="CAP-05-2026", owner_id=user.id, vigencia=4, estado="En ejecución", presupuesto_total=1000, descripcion="Organización y recuperación de archivos", objetivo_general="Organizar el archivo de gestión", objetivos_especificos=["Diagnosticar el archivo", "Clasificar los documentos"])
    db.add(project)
    db.flush()
    product = Producto(nombre="Resultado de clasificación", tipo="D2", owner_id=user.id, proyecto_id=project.id)
    db.add(product)
    db.commit()
    monkeypatch.setattr(get_settings(), "STORAGE_DIR", str(tmp_path))
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    yield db, user, project, product, tmp_path, TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()
    db.close()
    engine.dispose()


def test_catalog_exposes_guided_fields_periods_products_without_writing(documentation_context):
    db, _, project, product, _, client = documentation_context
    response = client.get(f"/proyectos/{project.id}/documentacion")
    assert response.status_code == 200
    data = response.json()
    assert data["revision"] == 0 and data["comunes"] == {}
    assert data["proyecto"]["nombre"] == project.nombre
    assert data["campos_comunes"] and all(field["label"] and field["help"] for field in data["campos_comunes"])
    assert [doc["periodo_bimestre"] for doc in data["documentos"] if doc["tipo"] == "informe_bimensual"] == [1, 2]
    assert all(doc["producto_id"] == str(product.id) for doc in data["documentos"] if doc["tipo"] in {"producto_resultado", "poster_producto"})
    assert {doc["formato"] for doc in data["documentos"]} == {"docx", "pptx"}
    assert all(doc["faltantes"] and not doc["generable"] for doc in data["documentos"])
    assert db.query(Documento).count() == 0


def test_common_data_is_persistent_and_optimistic_revision_prevents_overwrite(documentation_context):
    _, _, project, _, _, client = documentation_context
    url = f"/proyectos/{project.id}/documentacion/comunes"
    response = client.put(url, json={"revision": 0, "datos": {"centro": "CGAO", "fecha_inicio": "2026-03-01"}})
    assert response.status_code == 200
    assert response.json()["revision"] == 1
    assert client.get(f"/proyectos/{project.id}/documentacion").json()["comunes"]["centro"] == "CGAO"
    stale = client.put(url, json={"revision": 0, "datos": {"centro": "Otro centro"}})
    assert stale.status_code == 409
    assert client.get(f"/proyectos/{project.id}/documentacion").json()["comunes"]["centro"] == "CGAO"


@pytest.mark.parametrize("payload", [
    {"desconocido": "valor"}, {"fecha_inicio": "sin fecha"},
    {"fecha_inicio": "2026-04-01", "fecha_fin": "2026-03-01"},
    {"equipo": "texto sin filas"}, {"presupuesto": [{"rubro": "Personal", "valor_planeado": -1}]},
])
def test_common_validation_rejects_invalid_values_without_persistence(documentation_context, payload):
    _, _, project, _, _, client = documentation_context
    response = client.put(f"/proyectos/{project.id}/documentacion/comunes", json={"revision": 0, "datos": payload})
    assert response.status_code == 422
    assert client.get(f"/proyectos/{project.id}/documentacion").json()["revision"] == 0


def test_generation_rejects_incomplete_forms_without_creating_files(documentation_context):
    db, _, project, _, root, client = documentation_context
    response = client.post(f"/proyectos/{project.id}/documentacion/generar/acta_inicio", json={"revision": 0, "revision_comunes": 0})
    assert response.status_code == 422
    assert db.query(Documento).count() == 0
    assert not list(root.rglob("*.docx"))


@pytest.mark.parametrize("kind", ["formulacion_proyecto", "presentacion_proyecto", "informe_final"])
def test_documents_with_objectives_require_specific_objectives_in_project(documentation_context, kind):
    ctx = documentation_context
    complete_forms(ctx)
    ctx[2].objetivos_especificos = []
    ctx[0].commit()
    base = f"/proyectos/{ctx[2].id}/documentacion"
    item = next(item for item in ctx[-1].get(base).json()["documentos"] if item["tipo"] == kind)
    assert not item["generable"]
    assert any(pending["campo"] == "proyecto.objetivos_especificos" for pending in item["faltantes"])
    response = ctx[-1].post(base + "/generar/" + kind, json={"revision": 1, "revision_comunes": 1})
    assert response.status_code == 422 and "objetivos específicos" in response.json()["detail"]
    assert ctx[0].query(Documento).count() == 0
    assert not list(ctx[4].rglob("*.docx")) and not list(ctx[4].rglob("*.pptx"))


def field_value(field):
    key, kind = field["key"], field["type"]
    if kind == "rows":
        return [{column["key"]: field_value(column) for column in field["columns"]}]
    if kind == "number":
        value = 1000 if key in {"valor_planeado", "valor_real"} else 10
        return min(field.get("max", value), max(field.get("min", value), value))
    if kind == "date":
        return "2026-06-30" if key in {"fecha_fin", "periodo_hasta"} else "2026-03-01"
    if kind == "select":
        return field["options"][0]["value"]
    if key in {"hora_inicio", "hora_fin"}:
        return "08:00" if key == "hora_inicio" else "10:00"
    return "Información verificable de " + field["label"].lower()


def test_project_deletion_removes_documentation_and_files_without_removing_products(documentation_context):
    from pathlib import Path
    from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft, ProjectDocumentVersion

    ctx = documentation_context
    db, user, project, product, _, client = ctx
    project_id, product_id = str(project.id), str(product.id)
    other = Proyecto(nombre="Otro proyecto que se conserva", owner_id=user.id, estado="Aprobado")
    db.add(other)
    db.commit()
    other_id = str(other.id)
    complete_forms(ctx)
    base = f"/proyectos/{project_id}/documentacion"
    generated = client.post(base + "/generar/acta_inicio", json={"revision": 1, "revision_comunes": 1})
    assert generated.status_code == 200
    stored = db.query(Documento).one()
    path = Path(stored.file_path)
    assert path.is_file() and db.query(ProjectDocumentVersion).count() == 1

    removed = client.delete(f"/proyectos/{project_id}")
    assert removed.status_code == 200
    db.expire_all()
    assert db.get(Proyecto, project_id) is None
    assert db.get(Proyecto, other_id) is not None
    assert db.query(ProjectDocumentation).count() == 0
    assert db.query(ProjectDocumentDraft).count() == 0
    assert db.query(ProjectDocumentVersion).count() == 0
    assert db.query(Documento).count() == 0 and not path.exists()
    assert db.get(Producto, product_id) is not None
    assert db.get(Producto, product_id).proyecto_id is None


def complete_forms(ctx):
    *_, client = ctx
    base = f"/proyectos/{ctx[2].id}/documentacion"
    view = client.get(base).json()
    common = {field["key"]: field_value(field) for field in view["campos_comunes"] if field["key"] not in {"inconsistencias_fuente", "aclaraciones_fuente"}}
    response = client.put(base + "/comunes", json={"revision": 0, "datos": common})
    assert response.status_code == 200
    for item in view["documentos"]:
        data = {field["key"]: field_value(field) for field in item["campos"]}
        if item["tipo"] == "informe_bimensual":
            data.update(periodo_desde="2026-03-01" if item["periodo_bimestre"] == 1 else "2026-05-01",
                        periodo_hasta="2026-04-30" if item["periodo_bimestre"] == 1 else "2026-06-30")
        if item["tipo"] == "acta_cierre":
            data["fecha_reunion"] = "2026-06-30"
        response = client.put(base + "/borradores/" + item["clave"], json={"revision": 0, "datos": data})
        assert response.status_code == 200
    return client.get(base).json()


def test_all_document_kinds_generate_real_office_files_individual_download_and_zip(documentation_context):
    import base64
    from app.documentation_models import ProjectDocumentVersion
    ctx = documentation_context
    view = complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    names = []
    expected_files = []
    final_report_name = None
    for item in view["documentos"]:
        assert item["generable"] and item["faltantes"] == []
        response = ctx[-1].post(base + "/generar/" + item["clave"], json={"revision": item["revision"], "revision_comunes": view["revision"]})
        assert response.status_code == 200
        result = response.json()
        download = ctx[-1].get("/documentos/" + result["documento_id"] + "/download")
        assert download.status_code == 200
        content = base64.b64decode(download.json()["data_base64"])
        with ZipFile(io.BytesIO(content)) as package:
            assert "[Content_Types].xml" in package.namelist()
            part = "word/document.xml" if item["formato"] == "docx" else "ppt/slides/slide1.xml"
            assert "Fortalecimiento" in package.read(part).decode()
            if item["clave"] == "informe_final":
                assert "GCDTP-F-023 V01" in package.read("docProps/core.xml").decode()
                assert "14. Anexos" in package.read("word/document.xml").decode()
                final_report_name = result["nombre_archivo"]
        assert result["estado"] == "borrador"
        names.append(result["nombre_archivo"])
        expected_files.append({"nombre": result["nombre_archivo"], "carpeta": item["carpeta"], "contenido": content})
    assert {item["tipo"] for item in view["documentos"]} == {
        "formulacion_proyecto", "presentacion_proyecto", "acta_inicio", "producto_resultado", "poster_producto",
        "informe_bimensual", "acta_cierre", "informe_final", "registro_evidencias",
    }
    assert ctx[0].query(ProjectDocumentVersion).count() == len(view["documentos"])
    assert ctx[0].query(Documento).count() == len(view["documentos"])
    assert final_report_name
    archive = ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente/descargar")
    assert archive.status_code == 200
    with ZipFile(io.BytesIO(archive.content)) as package:
        assert all(any(path.endswith(name) for path in package.namelist()) for name in names)
        expected_folders = {
            "1ProyectoFomulado/", "2ActadeInicio/", "3Productos/",
            "3Productos/1InformeFinal/", "3Productos/2PosteryEventos/", "3Productos/3.InnovacionGestionEmpresarial/",
            "4InformesBimensuales/", "5ActaCierre/", "6EvidenciasFotograficas/", "7Borradoresyvarios/",
        }
        assert {path for path in package.namelist() if path.endswith("/")} == expected_folders
        for expected in expected_files:
            stored_path = next(path for path in package.namelist() if path.endswith("_" + expected["nombre"]))
            assert stored_path.split("/", 1)[0] == expected["carpeta"]
            assert package.read(stored_path) == expected["contenido"]
            with ZipFile(io.BytesIO(package.read(stored_path))) as generated_file:
                assert "[Content_Types].xml" in generated_file.namelist()
        final_path = next(path for path in package.namelist() if path.endswith("_" + final_report_name))
        with ZipFile(io.BytesIO(package.read(final_path))) as final_report:
            assert "GCDTP-F-023 V01" in final_report.read("docProps/core.xml").decode()
            assert "MARCADOR" not in final_report.read("word/document.xml").decode()
    assert ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()["completo"] is False


def test_version_snapshot_is_immutable_idempotent_and_invalidated_by_new_data(documentation_context):
    from app.documentation_models import ProjectDocumentVersion
    ctx = documentation_context
    view = complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    payload = {"revision": 1, "revision_comunes": 1}
    first = ctx[-1].post(base + "/generar/acta_inicio", json=payload).json()
    repeat = ctx[-1].post(base + "/generar/acta_inicio", json=payload).json()
    assert repeat == first
    version = ctx[0].query(ProjectDocumentVersion).one()
    original = version.snapshot["comunes"]["ciudad"]
    common = dict(view["comunes"], ciudad="Otra ciudad")
    assert ctx[-1].put(base + "/comunes", json={"revision": 1, "datos": common}).status_code == 200
    assert version.snapshot["comunes"]["ciudad"] == original
    assert ctx[-1].post(base + "/revisar/" + first["documento_id"], json={}).status_code == 409
    assert ctx[-1].post(base + "/generar/acta_inicio", json=payload).status_code == 409
    second = ctx[-1].post(base + "/generar/acta_inicio", json={"revision": 1, "revision_comunes": 2}).json()
    assert second["version"] == 2 and second["documento_id"] != first["documento_id"]
    assert ctx[0].query(ProjectDocumentVersion).count() == 2
    assert ctx[-1].post(base + "/revisar/" + second["documento_id"], json={"observacion": "Datos contrastados"}).status_code == 200
    history = next(item for item in ctx[-1].get(base).json()["documentos"] if item["tipo"] == "acta_inicio")["historial"]
    assert history[0]["estado"] == "revisado" and history[0]["vigente"] is True
    assert history[1]["estado"] == "borrador" and history[1]["vigente"] is False


def test_database_failure_rolls_back_document_version_and_generated_file(documentation_context):
    from app.documentation_models import ProjectDocumentVersion
    ctx = documentation_context
    complete_forms(ctx)
    ctx[0].execute(text("CREATE TRIGGER reject_document_version BEFORE INSERT ON project_document_versions BEGIN SELECT RAISE(ABORT, 'rechazo de prueba'); END"))
    ctx[0].commit()
    response = ctx[-1].post(f"/proyectos/{ctx[2].id}/documentacion/generar/acta_inicio", json={"revision": 1, "revision_comunes": 1})
    assert response.status_code == 500
    assert ctx[0].query(Documento).count() == 0
    assert ctx[0].query(ProjectDocumentVersion).count() == 0
    assert not list(ctx[4].rglob("*.docx"))


def test_permissions_and_invalid_project_or_document_slot(documentation_context):
    import uuid
    ctx = documentation_context
    base = f"/proyectos/{ctx[2].id}/documentacion"
    assert ctx[-1].get("/proyectos/no-es-uuid/documentacion").status_code == 422
    assert ctx[-1].get(f"/proyectos/{uuid.uuid4()}/documentacion").status_code == 404
    assert ctx[-1].put(base + "/borradores/inexistente", json={"revision": 0, "datos": {}}).status_code == 404
    assert ctx[-1].post(base + "/revisar/" + str(uuid.uuid4()), json={}).status_code == 404
    ctx[1].rol = "aprendiz"
    ctx[0].commit()
    assert ctx[-1].get(base).status_code == 200
    assert ctx[-1].put(base + "/comunes", json={"revision": 0, "datos": {}}).status_code == 403
    outsider = User(email="sin-acceso@example.com", nombre="Otro aprendiz", password_hash="example", rol="aprendiz")
    ctx[0].add(outsider)
    ctx[0].commit()
    app.dependency_overrides[get_current_user] = lambda: outsider
    assert ctx[-1].get(base).status_code == 403


def test_generated_documents_require_current_review_and_partial_closure_does_not_finish(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    result = ctx[-1].post(base + "/generar/acta_inicio", json={"revision": 1, "revision_comunes": 1}).json()
    stages = ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()["etapas"]
    assert stages[1]["completo"] is False
    assert any("revis" in message.lower() for message in stages[1]["faltantes"])
    assert ctx[-1].post(base + "/revisar/" + result["documento_id"], json={}).status_code == 200
    assert ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()["etapas"][1]["completo"] is True
    closing = next(item for item in view["documentos"] if item["tipo"] == "acta_cierre")
    data = dict(closing["datos"], tipo_cierre="parcial")
    assert ctx[-1].put(base + "/borradores/acta_cierre", json={"revision": 1, "datos": data}).status_code == 200
    generated = ctx[-1].post(base + "/generar/acta_cierre", json={"revision": 2, "revision_comunes": 1}).json()
    assert ctx[-1].post(base + "/revisar/" + generated["documento_id"], json={}).status_code == 200
    closing_stage = ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()["etapas"][4]
    assert closing_stage["completo"] is False
    assert any("parcial" in message.lower() for message in closing_stage["faltantes"])
    common = dict(view["comunes"], ciudad="Ciudad actualizada")
    assert ctx[-1].put(base + "/comunes", json={"revision": 1, "datos": common}).status_code == 200
    assert ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()["etapas"][1]["completo"] is False
    ctx[0].refresh(ctx[2])
    assert ctx[2].estado == "En ejecución"


def test_exclusive_file_collision_preserves_existing_content(documentation_context, monkeypatch):
    import uuid
    ctx = documentation_context
    complete_forms(ctx)
    identifier = uuid.uuid4()
    target = ctx[4] / "documentos" / f"{identifier}.docx"
    target.parent.mkdir()
    target.write_bytes(b"archivo previo que debe conservarse")
    monkeypatch.setattr("app.services.documentation_commands.uuid.uuid4", lambda: identifier)
    response = ctx[-1].post(f"/proyectos/{ctx[2].id}/documentacion/generar/acta_inicio", json={"revision": 1, "revision_comunes": 1})
    assert response.status_code == 500
    assert target.read_bytes() == b"archivo previo que debe conservarse"
    assert ctx[0].query(Documento).count() == 0


def test_altered_generated_file_is_not_reused_or_accepted_as_reviewed(documentation_context):
    ctx = documentation_context
    complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    payload = {"revision": 1, "revision_comunes": 1}
    first = ctx[-1].post(base + "/generar/acta_inicio", json=payload).json()
    assert ctx[-1].post(base + "/revisar/" + first["documento_id"], json={}).status_code == 200
    document = ctx[0].query(Documento).one()
    from pathlib import Path
    Path(document.file_path).write_bytes(b"archivo modificado fuera de la aplicacion")
    assert ctx[-1].post(base + "/revisar/" + first["documento_id"], json={}).status_code == 409
    assert ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()["etapas"][1]["completo"] is False
    second = ctx[-1].post(base + "/generar/acta_inicio", json=payload).json()
    assert second["version"] == 2 and second["documento_id"] != first["documento_id"]
    assert ctx[-1].post(base + "/revisar/" + second["documento_id"], json={}).status_code == 200
    assert ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente").json()["etapas"][1]["completo"] is True
    archive = ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente/descargar")
    with ZipFile(io.BytesIO(archive.content)) as package:
        assert any(path.endswith(second["nombre_archivo"]) for path in package.namelist())
        assert not any(path.endswith(first["nombre_archivo"]) for path in package.namelist())
