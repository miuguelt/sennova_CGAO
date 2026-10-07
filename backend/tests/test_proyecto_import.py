import io
import os
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db_support import db_path_for, sqlite_url_for

TEST_DB_URL = sqlite_url_for(db_path_for("test_proyecto_import.db"))
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["JWT_SECRET"] = "testsecretkey_long_enough_for_security_compliance_32_chars"

from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models import Aprendiz, Documento, Grupo, Proyecto, Semillero, User

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

current_user = User(
    id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email="importador@sena.edu.co",
    nombre="Usuario de importación",
    rol="investigador",
    is_active=True,
)
IMPORT_SEEDBED_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"


def make_docx(rows):
    """Crea un DOCX mínimo con filas y párrafos para probar la extracción CAP."""
    table_rows = []
    for row in rows:
        cells = "".join(
            "<w:tc><w:tcPr/><w:p><w:r><w:t xml:space='preserve'>"
            f"{escape(cell)}"
            "</w:t></w:r></w:p></w:tc>"
            for cell in row
        )
        table_rows.append(f"<w:tr>{cells}</w:tr>")
    document = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        "<w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'>"
        f"<w:body><w:tbl>{''.join(table_rows)}</w:tbl><w:sectPr/></w:body></w:document>"
    )
    file_bytes = io.BytesIO()
    with zipfile.ZipFile(file_bytes, "w", zipfile.ZIP_DEFLATED) as archive:
        for arcname, content in (
            ("[Content_Types].xml", "<Types/>"),
            ("word/document.xml", document),
        ):
            zinfo = zipfile.ZipInfo(arcname, date_time=(2026, 1, 1, 0, 0, 0))
            archive.writestr(zinfo, content)
    return file_bytes.getvalue()


def sample_formulation():
    return make_docx([
        ["Título del Proyecto", "Proyecto CAP de prueba"],
        ["Grupo de Investigación", "Grupo de prueba"],
        ["Nombre del Semillero", "Semillero de prueba"],
        ["Autores", "Este dato no debe importarse"],
        ["5. OBJETIVOS:", "Objetivo General:", "Desarrollar una solución para fortalecer la investigación del centro.",
         "Objetivos específicos:", "Identificar las necesidades del proceso de investigación institucional.",
         "Diseñar una herramienta para registrar los proyectos y sus resultados.", "Ruta de atención."],
        ["2. INTRODUCCIÓN: El proyecto organiza el seguimiento de proyectos y resultados."],
        ["3. PLANTEAMIENTO DEL PROBLEMA: La información se encuentra dispersa."],
        ["7. METODOLOGÍA: Se aplicará un enfoque descriptivo con validación de usuarios."],
        ["8. RESULTADOS ESPERADOS: Se espera mejorar la trazabilidad institucional."],
    ])


def malformed_docx():
    file_bytes = io.BytesIO()
    with zipfile.ZipFile(file_bytes, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", "<w:document")
    return file_bytes.getvalue()


def entity_docx():
    xml = """<?xml version="1.0" encoding="UTF-16"?>
    <!DOCTYPE w:document [<!ENTITY project "expanded">]>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>&project;</w:body></w:document>"""
    file_bytes = io.BytesIO()
    with zipfile.ZipFile(file_bytes, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", xml.encode("utf-16"))
    return file_bytes.getvalue()


@pytest.fixture(autouse=True)
def override_dependencies(tmp_path, monkeypatch):
    from app.routers import proyectos as proyectos_router

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: current_user
    monkeypatch.setattr(proyectos_router, "FORMULATION_STORAGE_DIR", tmp_path / "documentos", raising=False)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    investigator = User(
        id=current_user.id, nombre=current_user.nombre, email=current_user.email,
        password_hash="example", rol="investigador", is_active=True,
    )
    db.add(investigator)
    db.flush()
    group = Grupo(nombre="Investigadores CGAO", owner_id=investigator.id)
    db.add(group)
    db.flush()
    seedbed = Semillero(
        id=IMPORT_SEEDBED_ID, nombre="Gestión de proyectos", grupo_id=group.id,
        owner_id=investigator.id,
    )
    seedbed.investigadores.append(investigator)
    db.add(seedbed)
    db.commit()
    db.close()
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def test_preview_extracts_reviewable_project_fields_without_authors():
    response = client.post(
        "/proyectos/analizar-formulacion",
        files={"file": ("proyecto.docx", sample_formulation(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["suggested_fields"]["nombre"] == "Proyecto CAP de prueba"
    assert result["suggested_fields"]["objetivo_general"].startswith("Desarrollar una solución")
    assert result["suggested_fields"]["objetivos_especificos"] == [
        "Identificar las necesidades del proceso de investigación institucional.",
        "Diseñar una herramienta para registrar los proyectos y sus resultados.",
    ]
    assert "Introducción" in result["suggested_fields"]["descripcion"]
    assert "Autores" not in str(result)
    assert "Grupo de prueba" == result["referencias_detectadas"]["grupo"]
    assert "Semillero de prueba" == result["referencias_detectadas"]["semillero"]


@pytest.mark.parametrize(
    ("filename", "content", "expected_status"),
    [
        ("proyecto.pdf", b"not a docx", 400),
        ("proyecto.docx", b"not a zip", 400),
    ],
)
def test_preview_rejects_unsupported_or_malformed_files(filename, content, expected_status):
    response = client.post(
        "/proyectos/analizar-formulacion",
        files={"file": (filename, content, "application/octet-stream")},
    )

    assert response.status_code == expected_status
    assert response.json()["detail"]


def test_preview_rejects_files_larger_than_limit():
    oversized = b"x" * (10 * 1024 * 1024 + 1)
    response = client.post(
        "/proyectos/analizar-formulacion",
        files={"file": ("proyecto.docx", oversized, "application/octet-stream")},
    )

    assert response.status_code == 413
    assert "10 MB" in response.json()["detail"]


def test_preview_rejects_oversized_multipart_request_before_route_parsing():
    response = client.post(
        "/proyectos/analizar-formulacion",
        headers={"Content-Length": str(12 * 1024 * 1024)},
        files={"file": ("proyecto.docx", sample_formulation(), "application/octet-stream")},
    )

    assert response.status_code == 413
    assert "tamaño total" in response.json()["detail"].lower()


def test_preview_rejects_corrupt_document_xml():
    response = client.post(
        "/proyectos/analizar-formulacion",
        files={"file": ("proyecto.docx", malformed_docx(), "application/octet-stream")},
    )

    assert response.status_code == 400
    assert "XML" in response.json()["detail"]


def test_preview_rejects_xml_entities_even_when_encoded_as_utf16():
    response = client.post(
        "/proyectos/analizar-formulacion",
        files={"file": ("proyecto.docx", entity_docx(), "application/octet-stream")},
    )

    assert response.status_code == 400
    assert "no permitida" in response.json()["detail"]


def test_import_creates_project_and_keeps_original_docx_linked(tmp_path):
    from app.routers import proyectos as proyectos_router

    payload = {
        "nombre": "Proyecto CAP revisado",
        "semillero_id": IMPORT_SEEDBED_ID,
        "estado": "Aprobado",
        "tipologia": "Investigación",
        "objetivo_general": "Objetivo corregido por el instructor.",
        "objetivos_especificos": ["Objetivo específico editado."],
        "descripcion": "Resumen revisado antes de guardar.",
    }
    uploaded_bytes = sample_formulation()
    response = client.post(
        "/proyectos/importar-formulacion",
        data={"proyecto": __import__("json").dumps(payload, ensure_ascii=False)},
        files={"file": ("formulacion.docx", uploaded_bytes, "application/octet-stream")},
    )

    assert response.status_code == 201, response.text
    project = response.json()
    assert project["nombre"] == payload["nombre"]
    assert project["objetivo_general"] == payload["objetivo_general"]

    db = TestingSessionLocal()
    try:
        document = db.query(Documento).filter_by(entidad_tipo="proyecto", entidad_id=project["id"]).one()
        assert document.tipo == "formulacion_proyecto"
        assert document.nombre_archivo == "formulacion.docx"
        assert Path(document.file_path).read_bytes() == uploaded_bytes
        assert Path(document.file_path).parent == Path(proyectos_router.FORMULATION_STORAGE_DIR)
    finally:
        db.close()


def test_semillero_apprentice_can_read_source_document_for_accessible_project(tmp_path):
    from uuid import uuid4

    from app.models import Proyecto

    apprentice = User(
        id=str(uuid4()),
        email="aprendiz-semilla@sena.edu.co",
        password_hash="test-password-hash",
        nombre="Aprendiz del semillero",
        rol="aprendiz",
        is_active=True,
    )
    with TestingSessionLocal() as db:
        group_id = str(db.query(Grupo).one().id)
    seedbed = Semillero(
        id=str(uuid4()),
        nombre="Semillero de prueba",
        grupo_id=group_id,
        owner_id=current_user.id,
    )
    project = Proyecto(
        id=str(uuid4()),
        nombre="Proyecto asociado al semillero",
        owner_id=current_user.id,
        semillero_id=seedbed.id,
    )
    source_path = tmp_path / "formulacion.docx"
    source_path.write_bytes(sample_formulation())
    document = Documento(
        id=str(uuid4()),
        entidad_tipo="proyecto",
        entidad_id=project.id,
        tipo="formulacion_proyecto",
        nombre_archivo="formulacion.docx",
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        file_path=str(source_path),
        owner_id=current_user.id,
    )
    db = TestingSessionLocal()
    try:
        db.add_all([apprentice, seedbed, project, document])
        db.add(Aprendiz(id=str(uuid4()), semillero_id=seedbed.id, user_id=apprentice.id))
        db.commit()
        db.refresh(apprentice)
        project_id = str(project.id)
        document_id = str(document.id)
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: apprentice
    listing = client.get(f"/documentos/proyecto/{project_id}/list")
    all_project_documents = client.get("/documentos?entidad_tipo=proyecto")
    details = client.get(f"/documentos/{document_id}")
    download = client.get(f"/documentos/{document_id}/download")
    view = client.get(f"/documentos/{document_id}/view")

    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()] == [document_id]
    assert document_id in [item["id"] for item in all_project_documents.json()]
    assert details.status_code == 200
    assert download.status_code == 200
    assert download.json()["data_base64"]
    assert view.status_code == 200
    assert view.content == sample_formulation()

    unrelated_apprentice = User(
        id=str(uuid4()),
        email="aprendiz-ajeno@sena.edu.co",
        password_hash="test-password-hash",
        nombre="Aprendiz de otro semillero",
        rol="aprendiz",
        is_active=True,
    )
    app.dependency_overrides[get_current_user] = lambda: unrelated_apprentice
    denied_document = client.get(f"/documentos/{document_id}/download")
    denied_listing = client.get(f"/documentos/proyecto/{project_id}/list")
    unrelated_documents = client.get("/documentos?entidad_tipo=proyecto")

    assert denied_document.status_code == 403
    assert denied_listing.status_code == 403
    assert document_id not in [item["id"] for item in unrelated_documents.json()]


def test_import_rejects_invalid_project_payload_without_creating_attachment():
    response = client.post(
        "/proyectos/importar-formulacion",
        data={"proyecto": "{}"},
        files={"file": ("formulacion.docx", sample_formulation(), "application/octet-stream")},
    )

    assert response.status_code == 422
    db = TestingSessionLocal()
    try:
        assert db.query(Documento).count() == 0
    finally:
        db.close()


def test_import_rolls_back_project_when_storage_cannot_be_created(tmp_path, monkeypatch):
    from app.routers import proyectos as proyectos_router

    occupied_path = tmp_path / "not-a-directory"
    occupied_path.write_text("occupied", encoding="utf-8")
    monkeypatch.setattr(proyectos_router, "FORMULATION_STORAGE_DIR", occupied_path)
    payload = {"nombre": "Proyecto que debe revertirse", "semillero_id": IMPORT_SEEDBED_ID}

    response = client.post(
        "/proyectos/importar-formulacion",
        data={"proyecto": __import__("json").dumps(payload)},
        files={"file": ("formulacion.docx", sample_formulation(), "application/octet-stream")},
    )

    assert response.status_code == 500
    db = TestingSessionLocal()
    try:
        assert db.query(Documento).count() == 0
        assert db.query(Proyecto).filter_by(nombre=payload["nombre"]).count() == 0
    finally:
        db.close()


def test_title_can_be_extracted_from_the_numbered_content_section():
    from app.services.proyecto_import_service import extract_formulation_draft

    result = extract_formulation_draft("resumen.docx", make_docx([["1. TÍTULO: Título alternativo"]]))

    assert result["suggested_fields"] == {"nombre": "Título alternativo"}
    assert result["campos_no_detectados"] == [
        "objetivo_general", "objetivos_especificos", "descripcion"
    ]


def test_apprentices_cannot_analyze_or_import_formulations(monkeypatch):
    learner = User(
        id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        email="aprendiz@sena.edu.co",
        nombre="Aprendiz",
        rol="aprendiz",
        is_active=True,
    )
    app.dependency_overrides[get_current_user] = lambda: learner
    file = ("proyecto.docx", sample_formulation(), "application/octet-stream")

    preview = client.post("/proyectos/analizar-formulacion", files={"file": file})
    imported = client.post(
        "/proyectos/importar-formulacion",
        data={"proyecto": '{"nombre":"No permitido"}'},
        files={"file": ("proyecto.docx", sample_formulation(), "application/octet-stream")},
    )

    assert preview.status_code == 403
    assert imported.status_code == 403


def test_unrecognized_roles_cannot_analyze_or_import_formulations():
    unknown_user = User(
        id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        email="desconocido@sena.edu.co",
        nombre="Usuario sin rol autorizado",
        rol="visitante",
        is_active=True,
    )
    app.dependency_overrides[get_current_user] = lambda: unknown_user
    file = ("proyecto.docx", sample_formulation(), "application/octet-stream")

    preview = client.post("/proyectos/analizar-formulacion", files={"file": file})
    imported = client.post(
        "/proyectos/importar-formulacion",
        data={"proyecto": '{"nombre":"No permitido"}'},
        files={"file": ("proyecto.docx", sample_formulation(), "application/octet-stream")},
    )

    assert preview.status_code == 403
    assert imported.status_code == 403
