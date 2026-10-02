"""Integración PostgreSQL real; ejecutar con SENNOVA_TEST_POSTGRES_DSN configurada.

Cada prueba crea su propio esquema y lo elimina al finalizar. El proceso debe
ejecutar este módulo por separado para cargar UUID y ARRAY nativos desde el inicio.
"""

import base64
import copy
import hashlib
import importlib.util
import json
import os
import re
import secrets
import uuid
from threading import Barrier
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from zipfile import ZipFile

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

TEST_DSN = os.environ.get("SENNOVA_TEST_POSTGRES_DSN", "")
if TEST_DSN:
    os.environ["DATABASE_URL"] = TEST_DSN
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(32))

from app.auth import get_current_user
from app.config import get_settings
from app.database import Base, ensure_document_period_column, get_db
from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft, ProjectDocumentVersion
from app.models import Documento, Grupo, Producto, Proyecto, Semillero, User
from app.research_catalog import RESEARCH_SEEDBED_CATALOG, ensure_research_catalog
from app.routers import documentos
from app.routers.proyectos import _resolve_project_links
from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_commands import generate_version, save_common, save_draft
from app.services.documentation_schema import downgrade_documentation_schema, upgrade_documentation_schema
from app.services.documentation_state import documentation_view
from app.services.reference_documentation_import import import_reference_data
from app.services.project_evidence_service import (
    STAGES,
    build_project_file_zip,
    evaluate_project_file,
)


@pytest.fixture()
def postgres_context(tmp_path, monkeypatch):
    assert TEST_DSN, "Configure SENNOVA_TEST_POSTGRES_DSN para ejecutar la integración PostgreSQL."
    control = create_engine(TEST_DSN, connect_args={"connect_timeout": 5})
    engine = create_engine(TEST_DSN, connect_args={"connect_timeout": 5})
    assert engine.dialect.name == "postgresql"
    assert Proyecto.__table__.c.id.type.__class__.__name__ == "UUID", "Ejecute este módulo en un proceso separado con tipos nativos."
    schema = "evidence_test_" + uuid.uuid4().hex
    assert re.fullmatch(r"evidence_test_[0-9a-f]{32}", schema)

    @event.listens_for(engine, "connect")
    def isolate_schema(connection, _):
        previous = connection.autocommit
        connection.autocommit = True
        try:
            with connection.cursor() as cursor:
                cursor.execute('SET search_path TO "' + schema + '"')
        finally:
            connection.autocommit = previous

    with control.begin() as connection:
        connection.execute(text('CREATE SCHEMA "' + schema + '"'))
    db = None
    try:
        Base.metadata.create_all(engine)
        sessions = sessionmaker(bind=engine)
        db = sessions()
        owner = User(email="owner@example.com", nombre="Investigadora",
                     password_hash="example", rol="investigador")
        db.add(owner)
        db.flush()
        project = Proyecto(nombre="Proyecto de expediente PostgreSQL",
                           owner_id=owner.id, estado="En ejecución", vigencia=4,
                           presupuesto_total=1000, codigo_sgps="CAP-05-2026", tipologia="Red")
        db.add(project)
        db.commit()
        storage = tmp_path / "storage"
        document_storage = storage / "documentos"
        document_storage.mkdir(parents=True)
        monkeypatch.setattr(get_settings(), "STORAGE_DIR", str(storage))
        monkeypatch.setattr(documentos, "STORAGE_DIR", document_storage)
        application = FastAPI()
        application.include_router(documentos.router)
        application.dependency_overrides[get_db] = lambda: db
        application.dependency_overrides[get_current_user] = lambda: owner
        yield engine, db, owner, project, storage, TestClient(application)
    finally:
        if db is not None:
            db.close()
        engine.dispose()
        # El nombre generado y verificado sólo identifica el esquema de esta prueba.
        with control.begin() as connection:
            connection.execute(text('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE'))
        control.dispose()


def test_postgres_period_migration_preserves_legacy_document_and_is_idempotent(postgres_context):
    engine, db, *_ = postgres_context
    db.rollback()
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE documentos CASCADE"))
        connection.execute(text("CREATE TABLE documentos (id UUID PRIMARY KEY, nombre_archivo TEXT)"))
        connection.execute(text("INSERT INTO documentos VALUES (:id, 'informe_heredado.docx')"), {"id": str(uuid.uuid4())})

    assert ensure_document_period_column(engine) is True
    assert ensure_document_period_column(engine) is False
    assert "periodo_bimestre" in {column["name"] for column in inspect(engine).get_columns("documentos")}
    with engine.connect() as connection:
        assert connection.execute(text("SELECT nombre_archivo, periodo_bimestre FROM documentos")).one() == ("informe_heredado.docx", None)


def test_postgres_evaluates_six_stages_and_exports_actual_product_supports(postgres_context):
    _, db, owner, project, _, _ = postgres_context
    assert isinstance(project.id, uuid.UUID)
    assert isinstance(owner.id, uuid.UUID)
    assert evaluate_project_file(project, db)["completo"] is False
    product = Producto(nombre="Resultado documental", tipo="C1", owner_id=owner.id,
                       proyecto_id=project.id, is_verificado=True)
    db.add(product)
    db.flush()
    content = b"contenido de soporte real"
    for kind in ("formulacion_proyecto", "acta_inicio", "acta_cierre", "informe_final", "evidencia_fotografica", "soporte_minciencias"):
        db.add(Documento(
            entidad_tipo="producto" if kind == "soporte_minciencias" else "proyecto",
            entidad_id=product.id if kind == "soporte_minciencias" else project.id,
            tipo=kind, nombre_archivo="soporte.pdf", owner_id=owner.id,
            content_type="application/pdf", data_base64=base64.b64encode(content).decode(),
        ))
    for period in (1, 2):
        db.add(Documento(
            entidad_tipo="proyecto", entidad_id=project.id, tipo="informe_bimensual",
            nombre_archivo="informe.pdf", owner_id=owner.id, periodo_bimestre=period,
            content_type="application/pdf", data_base64=base64.b64encode(content).decode(),
        ))
    db.commit()
    report = evaluate_project_file(project, db)
    assert report["completo"] is True
    assert report["porcentaje_completitud"] == 100
    assert report["etapas"][3]["bimestres_pendientes"] == []
    package = build_project_file_zip(project, db)
    try:
        with ZipFile(package) as archive:
            assert {stage[1] + "/" for stage in STAGES}.issubset(archive.namelist())
            assert json.loads(archive.read("expediente.json"))["completo"] is True
            files = [name for name in archive.namelist() if name.endswith(".pdf")]
            assert len(files) == 8
            assert len(set(files)) == 8
            assert all(archive.read(name) == content for name in files)
            assert any(name.startswith("3Productos/") for name in files)
    finally:
        package.close()


def test_postgres_foreign_keys_and_link_validation_reject_missing_group(postgres_context):
    _, db, owner, _, _, _ = postgres_context
    group = Grupo(nombre="SIADM", owner_id=owner.id)
    db.add(group)
    db.flush()
    nursery = Semillero(nombre="Semillero administrativo", grupo_id=group.id, owner_id=owner.id)
    db.add(nursery)
    db.commit()

    assert _resolve_project_links({}, db)["grupo_id"] is None
    assert _resolve_project_links({"semillero_id": nursery.id}, db)["grupo_id"] == str(group.id)
    with pytest.raises(HTTPException) as missing:
        _resolve_project_links({"grupo_id": uuid.uuid4()}, db)
    assert missing.value.status_code == 404
    db.add(Proyecto(nombre="Referencia inexistente", owner_id=owner.id, grupo_id=str(uuid.uuid4())))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    assert db.query(Proyecto).filter_by(nombre="Referencia inexistente").count() == 0


def test_postgres_http_upload_persists_file_period_and_rejects_invalid_target(postgres_context):
    _, db, owner, project, storage, client = postgres_context
    content = b"informe bimestral real"
    data = {"entidad_tipo": "proyecto", "entidad_id": str(project.id),
            "tipo": "informe_bimensual", "periodo_bimestre": "1"}
    response = client.post("/documentos/upload", data=data,
                           files={"file": ("informe.pdf", content, "application/pdf")})
    assert response.status_code == 201, response.text
    document_id = response.json()["id"]
    persisted = db.get(Documento, uuid.UUID(document_id))
    assert persisted.entidad_id == project.id
    assert persisted.owner_id == owner.id
    assert persisted.periodo_bimestre == 1
    assert Path(persisted.file_path).read_bytes() == content
    assert Path(persisted.file_path).resolve().is_relative_to(storage.resolve())
    count = db.query(Documento).count()

    for overridden, status in (({"periodo_bimestre": "3"}, 422),
                               ({"entidad_id": str(uuid.uuid4())}, 404),
                               ({"entidad_id": "example"}, 422)):
        invalid = client.post("/documentos/upload", data={**data, **overridden},
                              files={"file": ("informe.pdf", content, "application/pdf")})
        assert invalid.status_code == status
        assert db.query(Documento).count() == count
    assert len(list((storage / "documentos").iterdir())) == 1


def test_postgres_four_concurrent_catalog_startups_create_one_group_and_twelve_seedbeds(postgres_context):
    engine, db, _, _, _, _ = postgres_context
    admin = User(email="admin@example.com", nombre="Administrador de prueba",
                 password_hash="example", rol="admin", is_active=True)
    db.add(admin)
    db.commit()
    sessions = sessionmaker(bind=engine)

    def startup(_):
        with sessions() as session:
            result = ensure_research_catalog(session)
            return result.created

    with ThreadPoolExecutor(max_workers=4) as workers:
        created_counts = list(workers.map(startup, range(4)))

    assert sorted(created_counts) == [0, 0, 0, 12]
    db.expire_all()
    groups = db.query(Grupo).all()
    seedbeds = db.query(Semillero).all()
    assert len(groups) == 1
    assert {seedbed.sigla for seedbed in seedbeds} == {
        sigla for sigla, _ in RESEARCH_SEEDBED_CATALOG
    }
    assert {str(seedbed.grupo_id) for seedbed in seedbeds} == {str(groups[0].id)}
    assert ensure_research_catalog(db).created == 0


def field_value(field):
    """Datos sintéticos válidos para probar la persistencia y los archivos reales."""
    key, kind = field["key"], field["type"]
    if kind == "rows":
        return [{column["key"]: field_value(column) for column in field["columns"]}]
    if kind == "number":
        return 1000 if key in {"valor_planeado", "valor_real"} else 10
    if kind == "date":
        return "2026-06-30" if key in {"fecha_fin", "periodo_hasta"} else "2026-03-01"
    if kind == "select":
        return field["options"][0]["value"]
    if key in {"hora_inicio", "hora_fin"}:
        return "08:00" if key == "hora_inicio" else "10:00"
    return "Información verificable de " + field["label"].lower()


def prepare_generated_forms(postgres_context, keys):
    _, db, owner, project, _, _ = postgres_context
    project.objetivo_general = "Organizar el archivo de gestión"
    project.objetivos_especificos = ["Diagnosticar el archivo", "Clasificar los documentos"]
    db.commit()
    common = {field["key"]: field_value(field) for field in COMMON_FIELDS
              if field["key"] != "inconsistencias_fuente"}
    saved = save_common(project, db, owner, 0, common)
    assert saved["revision"] == 1
    common = saved["datos"]
    for key in keys:
        values = {field["key"]: field_value(field) for field in DOCUMENT_DEFINITIONS[key]["fields"]}
        assert save_draft(project, db, owner, key, 0, values)["revision"] == 1
    view = documentation_view(project, db)
    assert all(item["generable"] for item in view["documentos"] if item["clave"] in keys)
    return common


def test_postgres_documentation_tables_use_jsonb_and_enforce_foreign_keys_and_uniques(postgres_context):
    engine, db, owner, project, _, _ = postgres_context
    inspector = inspect(engine)
    expected = {"project_documentation": {"datos", "fuente_snapshot"},
                "project_document_drafts": {"datos"}, "project_document_versions": {"snapshot"}}
    for table, columns in expected.items():
        reflected = {column["name"]: column["type"] for column in inspector.get_columns(table)}
        assert all(isinstance(reflected[column], JSONB) for column in columns)
        assert inspector.get_foreign_keys(table)

    assert save_common(project, db, owner, 0, {"centro": "Centro inicial"})["revision"] == 1
    assert save_draft(project, db, owner, "acta_inicio", 0, {"lugar": "Auditorio inicial"})["revision"] == 1
    db.add(ProjectDocumentDraft(proyecto_id=project.id, clave="acta_inicio", tipo="acta_inicio", updated_by=owner.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    assert db.query(ProjectDocumentDraft).count() == 1
    db.add(ProjectDocumentation(proyecto_id=uuid.uuid4(), updated_by=owner.id, datos={"centro": "Inválido"}))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    assert db.query(ProjectDocumentation).count() == 1
    db.add(ProjectDocumentVersion(borrador_id=uuid.uuid4(), version=1, revision_comunes=0,
                                 revision_borrador=0, snapshot={}, sha256="a" * 64, created_by=owner.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    assert db.query(ProjectDocumentVersion).count() == 0


def test_postgres_optimistic_common_and_draft_saves_preserve_previous_values(postgres_context):
    _, db, owner, project, _, _ = postgres_context
    common = {"centro": "Centro confirmado", "equipo": [{"nombre": "Equipo sintético", "rol": "Líder", "actividades": "Diagnóstico"}]}
    assert save_common(project, db, owner, 0, common) == {"revision": 1, "datos": common}
    assert save_draft(project, db, owner, "acta_inicio", 0, {"lugar": "Auditorio confirmado"})["revision"] == 1
    with pytest.raises(HTTPException) as stale_common:
        save_common(project, db, owner, 0, {"centro": "Sobrescritura"})
    assert stale_common.value.status_code == 409
    db.rollback()
    with pytest.raises(HTTPException) as stale_draft:
        save_draft(project, db, owner, "acta_inicio", 0, {"lugar": "Sobrescritura"})
    assert stale_draft.value.status_code == 409
    db.rollback()
    assert db.get(ProjectDocumentation, project.id).datos == common
    assert db.query(ProjectDocumentDraft).one().datos == {"lugar": "Auditorio confirmado"}


def test_postgres_reference_import_is_private_idempotent_and_preserves_edits_and_source(postgres_context):
    _, db, owner, _, _, _ = postgres_context
    # Reutiliza únicamente datos sintéticos; no depende de la referencia real ignorada.
    location = Path(__file__).parents[1] / "tests" / "test_reference_documentation_import.py"
    specification = importlib.util.spec_from_file_location("synthetic_reference_fixture", location)
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    payload = module.payload.__wrapped__()
    imported = import_reference_data(db, owner, payload)
    assert imported["creado"] is True and imported["advertencias"]
    reference = db.get(Proyecto, uuid.UUID(imported["proyecto_id"]))
    assert reference.is_publico is False and reference.estado == "Referencia"
    assert reference.codigo_sgps is None and reference.vigencia == 15
    assert reference.owner_id == owner.id and reference.grupo_id is None
    row = db.get(ProjectDocumentation, reference.id)
    assert row.fuente_snapshot == payload
    assert row.datos["codigo_cap"] == "CAP-06-2026"
    assert "Código de inicio distinto" in row.datos["inconsistencias_fuente"]
    drafts = db.query(ProjectDocumentDraft).filter_by(proyecto_id=reference.id).all()
    assert len(drafts) == 6
    assert all(draft.tipo != "informe_final" for draft in drafts)
    assert next(draft for draft in drafts if draft.tipo == "acta_cierre").datos["tipo_cierre"] == "parcial"
    assert db.query(User).count() == 1 and db.query(Producto).count() == 0
    assert db.query(Documento).count() == 0 and db.query(ProjectDocumentVersion).count() == 0
    assert save_common(reference, db, owner, 0, {"centro": "Edición conservada"})["revision"] == 1
    assert save_draft(reference, db, owner, "acta_inicio", 0, {"lugar": "Edición conservada"})["revision"] == 1
    repeated = import_reference_data(db, owner, payload)
    assert repeated["proyecto_id"] == imported["proyecto_id"] and repeated["creado"] is False
    assert db.query(Proyecto).count() == 2 and db.query(ProjectDocumentDraft).count() == 6
    assert db.get(ProjectDocumentation, reference.id).datos == {"centro": "Edición conservada"}
    assert db.get(ProjectDocumentation, reference.id).fuente_snapshot == payload
    assert db.query(ProjectDocumentDraft).filter_by(proyecto_id=reference.id, clave="acta_inicio").one().datos == {"lugar": "Edición conservada"}


def test_postgres_generation_persists_real_docx_pptx_immutable_snapshots_hash_and_zip(postgres_context):
    _, db, owner, project, _, _ = postgres_context
    common = prepare_generated_forms(postgres_context, ["acta_inicio", "presentacion_proyecto"])
    generated = [generate_version(project, db, owner, key, 1, 1)
                 for key in ("acta_inicio", "presentacion_proyecto")]
    versions = db.query(ProjectDocumentVersion).all()
    assert len(versions) == 2 and db.query(Documento).count() == 2
    original_snapshots = {str(version.id): copy.deepcopy(version.snapshot) for version in versions}
    for version in versions:
        assert version.version == 1 and version.revision_comunes == version.revision_borrador == 1
        assert version.estado == "borrador" and version.created_by == owner.id
        assert version.snapshot["comunes"] == common
        content = Path(version.documento.file_path).read_bytes()
        assert hashlib.sha256(content).hexdigest() == version.sha256
        with ZipFile(version.documento.file_path) as office:
            assert "[Content_Types].xml" in office.namelist()
            xml_name = "word/document.xml" if version.documento.tipo == "acta_inicio" else "ppt/slides/slide1.xml"
            assert project.nombre in office.read(xml_name).decode("utf-8")

    version = versions[0]
    db.add(ProjectDocumentVersion(borrador_id=version.borrador_id, version=version.version,
                                 revision_comunes=1, revision_borrador=1, snapshot={}, sha256="a" * 64, created_by=owner.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    assert db.query(ProjectDocumentVersion).count() == 2
    save_common(project, db, owner, 1, {**common, "ciudad": "Otra ciudad confirmada"})
    assert {str(item.id): item.snapshot for item in db.query(ProjectDocumentVersion).all()} == original_snapshots
    package = build_project_file_zip(project, db)
    try:
        with ZipFile(package) as archive:
            assert {stage[1] + "/" for stage in STAGES}.issubset(archive.namelist())
            report = json.loads(archive.read("expediente.json"))
            assert report["completo"] is False
            for result in generated:
                names = [name for name in archive.namelist() if name.endswith(result["nombre_archivo"])]
                assert len(names) == 1
                document = db.get(Documento, uuid.UUID(result["documento_id"]))
                assert archive.read(names[0]) == Path(document.file_path).read_bytes()
    finally:
        package.close()


def test_postgres_concurrent_generation_for_same_revision_returns_one_document_and_version(postgres_context):
    engine, db, owner, project, storage, _ = postgres_context
    prepare_generated_forms(postgres_context, ["acta_inicio"])
    project_id, owner_id = project.id, owner.id
    db.rollback()
    sessions = sessionmaker(bind=engine)
    barrier = Barrier(2)

    def generate(_):
        with sessions() as session:
            target = session.get(Proyecto, project_id)
            author = session.get(User, owner_id)
            barrier.wait(timeout=15)
            return generate_version(target, session, author, "acta_inicio", 1, 1)

    with ThreadPoolExecutor(max_workers=2) as workers:
        futures = [workers.submit(generate, index) for index in range(2)]
        results = [future.result(timeout=45) for future in futures]
    assert results[0] == results[1]
    assert results[0]["version"] == 1 and results[0]["estado"] == "borrador"
    db.expire_all()
    assert db.query(ProjectDocumentVersion).count() == 1
    assert db.query(Documento).count() == 1
    assert len(list((storage / "documentos").glob("*.docx"))) == 1


def test_postgres_documentation_schema_repairs_jsonb_preserves_rows_and_restricts_downgrade(postgres_context):
    engine, db, owner, project, _, _ = postgres_context
    project_id, owner_id = project.id, owner.id
    db.add(ProjectDocumentation(proyecto_id=project_id, updated_by=owner_id,
                                revision=3, datos={"centro": "Centro conservado"}))
    db.commit()
    db.rollback()
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE project_documentation DROP COLUMN fuente_snapshot"))
    result = upgrade_documentation_schema(engine)
    assert result == {"created_tables": [], "added_columns": ["project_documentation.fuente_snapshot"]}
    columns = {column["name"]: column["type"] for column in inspect(engine).get_columns("project_documentation")}
    assert isinstance(columns["fuente_snapshot"], JSONB)
    assert upgrade_documentation_schema(engine) == {"created_tables": [], "added_columns": []}
    db.expire_all()
    preserved = db.get(ProjectDocumentation, project_id)
    assert preserved.revision == 3 and preserved.datos == {"centro": "Centro conservado"}
    assert preserved.fuente_snapshot is None
    db.rollback()
    with pytest.raises(ValueError, match="contienen datos"):
        downgrade_documentation_schema(engine)
    assert db.query(ProjectDocumentation).count() == 1
    assert {"project_documentation", "project_document_drafts", "project_document_versions"}.issubset(inspect(engine).get_table_names())
    db.query(ProjectDocumentation).delete()
    db.commit()
    db.rollback()
    assert downgrade_documentation_schema(engine) == ["project_document_versions", "project_document_drafts", "project_documentation"]
    assert downgrade_documentation_schema(engine) == []
    assert db.get(Proyecto, project_id).nombre == "Proyecto de expediente PostgreSQL"
    assert db.query(User).count() == 1
    db.rollback()
    assert set(upgrade_documentation_schema(engine)["created_tables"]) == {"project_documentation", "project_document_drafts", "project_document_versions"}
    assert upgrade_documentation_schema(engine) == {"created_tables": [], "added_columns": []}
