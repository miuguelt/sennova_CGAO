"""Importación aislada y no destructiva de una referencia sintética de proyecto."""

import copy
import io
import json
import os
import secrets
from xml.etree import ElementTree
from zipfile import ZipFile

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(32))

from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft, ProjectDocumentVersion
from app.models import Base, Documento, Grupo, Producto, Proyecto, User
from app.services.documentation_state import documentation_view, project_context
from app.services.documentation_renderers import render_document
from app.services.reference_documentation_import import ReferenceImportError, import_reference_data


@pytest.fixture()
def database():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("PRAGMA foreign_keys=ON"))
    with sessionmaker(bind=engine)() as db:
        user = User(email="admin@example.com", nombre="Administrador de prueba",
                    password_hash="example", rol="admin", is_active=True)
        db.add(user)
        db.commit()
        yield engine, db, user
    engine.dispose()


@pytest.fixture()
def payload():
    return {
        "schema_version": 1,
        "source_directory": "docs/CAP-05-2026_FortalecimeintoArchivo",
        "source_blocks": [{"path": "docs/CAP-05-2026_FortalecimeintoArchivo/2ActadeInicio/example.docx",
                           "sha256": "a" * 64, "parts": [{"text": "Texto fuente íntegro"}]}],
        "observations": [{"id": "codigo_cap", "description": "Código de inicio distinto del informe."}],
        "examples": {
            "acta_inicio": {
                "nombre_proyecto": "Proyecto sintético de organización documental", "codigo_cap": "CAP-06-2026",
                "objetivo_general": "Organizar documentos mediante criterios técnicos verificables.",
                "valor_total_cop": 10996585, "duracion_meses_declarada": 15,
                "centro": "Centro de prueba", "responsable": "Equipo de prueba", "ciudad": "Vélez",
                "fecha_inicio_textual": "01-02-2026", "fecha_fin_textual": "30-09-2027",
                "fecha_reunion_textual": "15/04/2026", "hora_inicio": "8:00 am", "hora_fin": "10:00 am",
                "lugar": "Auditorio de prueba", "temas": ["Actividades", "Presupuesto"],
                "objetivos_reunion": "Definir alcance y actividades.",
                "equipo": [{"nombre": "Persona de referencia sintética", "rol": "Líder", "actividades_a_liderar": "Diagnóstico"}],
                "presupuesto": [{"rubro": "Personal", "valor_planeado_textual": "$ 10.000.000", "descripcion_uso": "Honorarios", "fecha_ejecucion_textual": "Mes 1"},
                                {"rubro": "Materiales", "valor_planeado_textual": "", "descripcion_uso": "", "fecha_ejecucion_textual": ""}],
                "actividades": [{"actividad": "Diagnosticar", "encargado": "Equipo de prueba", "fecha_textual": "Mes 1"}],
                "alcance_sector_productivo": "Archivos públicos", "alcance_academia_formacion": "Práctica formativa",
                "observaciones_conclusiones": ["Revisar el código."],
                "asistentes": [{"nombre": "Persona sintética", "cargo_dependencia_entidad": "Equipo", "firma_textual": ""}], "invitados": [],
            },
            "presentacion_proyecto": {
                "introduccion": ["Introducción", "Descripción fuente"], "contexto_problema": ["Contexto"],
                "problema_investigacion": ["Problema"], "justificacion": ["Justificación"],
                "referente_teorico": ["Teoría de referencia"], "marco_normativo": ["Norma citada en la fuente"],
                "metodologia_poblacion_muestra": ["Enfoque cualitativo", "Muestra de archivos"],
                "tecnicas_recoleccion": ["Observación"], "fases_cronograma": ["Diagnóstico"],
                "resultados_esperados": ["Inventario actualizado"], "objetivos_especificos": ["Clasificar documentos"],
                "impactos_texto_en_imagen": {"institucional": ["Mejor recuperación"]},
                "conclusiones": ["Conclusión de ejemplo"], "referencias": ["Referencia fuente"],
            },
            "informe_bimensual": {
                "codigo_cap": "CAP-05-2026", "antecedentes": "Contexto del período",
                "metodologia": "Observación de archivos", "tabla_avances": [{"entidad": "Entidad sintética", "actividades_ejecutadas": "Clasificación", "resultados_alcanzados": "Inventario parcial", "evidencia": "Soporte declarado"}],
                "discusion": ["Discusión fuente"], "fortalezas": ["Participación"], "dificultades": ["Volumen documental"],
                "acciones_futuras": ["Continuar"], "lecciones_aprendidas": ["Hacer diagnóstico"],
                "conclusion": ["Avance parcial"], "referencias": ["Referencia"],
                "fecha_inicio_periodo": None, "fecha_fin_periodo": None,
            },
            "acta_cierre": {
                "codigo_cap": "CAP-05-2026", "alcance_cierre": "parcial_del_periodo_ejecutado",
                "ciudad_fecha_textual": "Vélez, 18 septiembre", "fecha_reunion_iso": None,
                "hora_inicio": "2:00 pm", "hora_fin": "6:00 pm", "lugar": None,
                "objetivos_reunion": "Evaluar el período", "temas": ["Avances"],
                "evaluacion_actividades": [{"actividad_etapa": "Diagnóstico", "entregable": "Inventario", "observacion": "Parcial"}],
                "balance_presupuestal": [{"rubro": "Personal", "valor_planeado_textual": "$10.996.585", "valor_real_textual": "Pago de honorarios"}],
                "fortalezas": ["Participación"], "dificultades": ["Recursos"], "acciones_futuras": ["Continuar"],
                "lecciones_aprendidas": ["Diagnosticar"], "listado_activos": ["Inventario declarado"],
                "observaciones_conclusiones": ["El cierre no implica terminación definitiva."],
                "asistentes": [], "invitados": [],
            },
            "poster": {"introduccion": "Introducción del póster", "planteamiento_problema": "Problema documental",
                       "justificacion": "Necesidad del territorio", "referente_teorico": "Teoría", "metodologia": "Método",
                       "bibliografia": "Referencias", "avances_texto_fuente": "Texto residual de plantilla",
                       "avances_confirmados": None, "links_acceso_confirmados": []},
        },
    }


def test_import_creates_private_reference_and_preserves_entire_source(database, payload):
    _, db, user = database
    result = import_reference_data(db, user, payload)
    project = db.get(Proyecto, result["proyecto_id"])
    common = db.get(ProjectDocumentation, project.id)

    assert result["creado"] is True
    assert project.nombre == payload["examples"]["acta_inicio"]["nombre_proyecto"] + " (referencia de validación)"
    assert project.codigo_sgps is None
    assert project.vigencia == 15
    assert project.año == 2026 and project.año_fin == 2027
    assert project.presupuesto_total == 10996585
    assert project.is_publico is False and project.estado != "Finalizado"
    assert project.owner_id == user.id
    assert project.grupo_id is None and project.semillero_id is None
    assert common.fuente_snapshot == payload
    assert common.datos["codigo_cap"] == "CAP-06-2026"
    assert common.datos["fecha_inicio"] == "2026-02-01"
    assert common.datos["regional"] == ""
    assert common.datos["presupuesto"][0]["valor_planeado"] == "10000000"
    assert common.datos["presupuesto"][1]["valor_planeado"] == ""
    assert common.datos["cronograma"][0]["fecha_textual"] == "Mes 1"
    assert common.datos["cronograma"][0]["resultado"] == ""
    assert "Código de inicio distinto" in common.datos["inconsistencias_fuente"]
    assert result["advertencias"]
    assert any("SGPS" in warning and "no aporta" in warning for warning in result["advertencias"])


def test_import_accepts_the_second_shared_reference_and_uses_its_identity(database, payload):
    _, db, user = database
    second_directory = "docs/CAP-14-2026 Sistemade Información Investigación"
    payload["source_directory"] = second_directory
    payload["source_blocks"][0]["path"] = second_directory + "/2ActadeInicio/acta.docx"
    payload["examples"]["acta_inicio"].update({
        "nombre_proyecto": "Sistema de información del CGAO",
        "codigo_cap": "CAP-14-2026",
        "centro": "Centro de Gestión Agroempresarial del Oriente",
        "regional": "Santander",
        "ciudad": "Vélez",
        "fecha_inicio_textual": "29-05-2026",
        "fecha_fin_textual": "23-12-2026",
    })

    result = import_reference_data(db, user, payload)

    project = db.get(Proyecto, result["proyecto_id"])
    assert result["creado"] is True
    assert project.nombre == "Sistema de información del CGAO (referencia de validación)"
    common = db.get(ProjectDocumentation, project.id)
    assert common.fuente_snapshot["source_directory"] == second_directory
    assert common.datos["regional"] == "Santander"
    assert common.datos["fecha_inicio"] == "2026-05-29"
    assert not any("organización documental" in warning.lower() for warning in result["advertencias"])
    assert any("temporalmente en el bimestre 1" in warning for warning in result["advertencias"])

    for kind, expected_mime, office_part in (
        ("acta_inicio", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "word/document.xml"),
        ("presentacion_proyecto", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "ppt/slides/slide1.xml"),
    ):
        draft = db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id, tipo=kind).one()
        content, mime = render_document(kind, project_context(project), common.datos, draft.datos)
        with ZipFile(io.BytesIO(content)) as office:
            assert mime == expected_mime
            assert office_part in office.namelist()

    repeated = import_reference_data(db, user, payload)
    assert repeated["creado"] is False
    assert repeated["proyecto_id"] == result["proyecto_id"]
    assert db.query(Proyecto).count() == 1


def test_two_shared_references_create_separate_private_projects(database, payload):
    _, db, user = database
    first = import_reference_data(db, user, copy.deepcopy(payload))
    second_payload = copy.deepcopy(payload)
    second_directory = "docs/CAP-14-2026 Sistemade Información Investigación"
    second_payload["source_directory"] = second_directory
    second_payload["source_blocks"][0]["path"] = second_directory + "/2ActadeInicio/acta.docx"
    second_payload["examples"]["acta_inicio"].update({
        "nombre_proyecto": "Sistema de información del CGAO",
        "codigo_cap": "CAP-14-2026",
    })
    second = import_reference_data(db, user, second_payload)

    assert first["proyecto_id"] != second["proyecto_id"]
    assert db.query(Proyecto).count() == 2
    projects = {project.nombre for project in db.query(Proyecto).all()}
    assert "Proyecto sintético de organización documental (referencia de validación)" in projects
    assert "Sistema de información del CGAO (referencia de validación)" in projects


def test_reference_drafts_do_not_fabricate_final_reports_or_numeric_results(database, payload):
    _, db, user = database
    result = import_reference_data(db, user, payload)
    drafts = {draft.clave: draft for draft in db.query(ProjectDocumentDraft).all()}
    assert set(drafts) == {"formulacion_proyecto", "presentacion_proyecto", "acta_inicio", "poster_producto", "informe_bimensual__b1", "acta_cierre"}
    assert drafts["acta_cierre"].datos["tipo_cierre"] == "parcial"
    assert drafts["acta_cierre"].datos["balance"][0]["valor_real"] == ""
    assert drafts["acta_cierre"].datos["balance"][0]["observacion"] == "Pago de honorarios"
    report = drafts["informe_bimensual__b1"]
    assert report.periodo_bimestre == 1
    assert report.datos["periodo_desde"] == "" and report.datos["periodo_hasta"] == ""
    assert report.datos["resultados"][0]["meta"] == ""
    assert report.datos["resultados"][0]["logro"] == ""
    assert drafts["poster_producto"].datos["avances"] == ""
    assert drafts["poster_producto"].producto_id is None
    view = documentation_view(db.get(Proyecto, result["proyecto_id"]), db)
    report_view = next(item for item in view["documentos"] if item["clave"] == "informe_bimensual__b1")
    assert report_view["generable"] is False
    assert report_view["historial"] == []
    assert db.query(Documento).count() == db.query(ProjectDocumentVersion).count() == 0
    assert db.query(Producto).count() == db.query(Grupo).count() == 0
    assert db.query(User).count() == 1


def test_reimport_does_not_duplicate_or_overwrite_edits(database, payload):
    _, db, user = database
    first = import_reference_data(db, user, payload)
    project = db.get(Proyecto, first["proyecto_id"])
    project.nombre = "Nombre corregido por el usuario"
    common = db.get(ProjectDocumentation, project.id)
    common.datos = {"centro": "Centro corregido"}
    common.revision = 2
    draft = db.query(ProjectDocumentDraft).filter_by(clave="acta_inicio").one()
    draft.datos = {"lugar": "Lugar actualizado"}
    draft.revision = 3
    db.commit()
    changed = copy.deepcopy(payload)
    changed["examples"]["acta_inicio"]["centro"] = "Texto diferente con mismos archivos fuente"

    second = import_reference_data(db, user, changed)

    assert second["creado"] is False
    assert second["proyecto_id"] == first["proyecto_id"]
    assert db.query(Proyecto).count() == 1 and db.query(ProjectDocumentDraft).count() == 6
    assert project.nombre == "Nombre corregido por el usuario"
    assert common.datos == {"centro": "Centro corregido"} and common.revision == 2
    assert common.fuente_snapshot == payload
    assert draft.datos == {"lugar": "Lugar actualizado"} and draft.revision == 3


def test_real_insert_error_rolls_back_project_common_and_drafts(database, payload):
    engine, db, user = database
    with engine.begin() as connection:
        connection.execute(text("CREATE TRIGGER reject_reference BEFORE INSERT ON project_document_drafts BEGIN SELECT RAISE(ABORT, 'example'); END"))
    with pytest.raises(ReferenceImportError, match="guardar"):
        import_reference_data(db, user, payload)
    assert db.query(Proyecto).count() == 0
    assert db.query(ProjectDocumentation).count() == 0
    assert db.query(ProjectDocumentDraft).count() == 0
    assert db.query(User).count() == 1


@pytest.mark.parametrize("change", ["wrong_source", "invalid_hash", "missing_name"])
def test_invalid_reference_payload_never_changes_database(database, payload, change):
    _, db, user = database
    if change == "wrong_source":
        payload["source_directory"] = "docs/example"
    elif change == "invalid_hash":
        payload["source_blocks"][0]["sha256"] = "example"
    else:
        payload["examples"]["acta_inicio"]["nombre_proyecto"] = ""
    with pytest.raises(ReferenceImportError):
        import_reference_data(db, user, payload)
    assert db.query(Proyecto).count() == 0


def test_import_requires_active_existing_staff(database, payload):
    _, db, user = database
    user.rol = "aprendiz"
    db.commit()
    with pytest.raises(ReferenceImportError, match="permiso"):
        import_reference_data(db, user, payload)
    assert db.query(Proyecto).count() == 0


def test_cli_imports_the_given_json_and_requires_debug(database, payload, tmp_path, monkeypatch, capsys):
    from types import SimpleNamespace
    from scripts import import_documentation_reference

    engine, db, user = database
    source = tmp_path / "reference.json"
    source.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(import_documentation_reference, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setattr(import_documentation_reference, "get_settings", lambda: SimpleNamespace(DEBUG=False))
    assert import_documentation_reference.main(["--input", str(source)]) == 1
    assert db.query(Proyecto).count() == 0
    assert "DEBUG" in capsys.readouterr().out
    monkeypatch.setattr(import_documentation_reference, "get_settings", lambda: SimpleNamespace(DEBUG=True))
    assert import_documentation_reference.main(["--input", str(source), "--owner-id", str(user.id)]) == 0
    assert db.query(Proyecto).count() == 1
    assert "creado" in capsys.readouterr().out
    assert import_documentation_reference.main(["--input", str(source)]) == 0
    assert db.query(Proyecto).count() == 1


def test_cli_rejects_missing_source_and_missing_admin(database, payload, tmp_path, monkeypatch):
    from types import SimpleNamespace
    from scripts import import_documentation_reference

    engine, db, user = database
    monkeypatch.setattr(import_documentation_reference, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setattr(import_documentation_reference, "get_settings", lambda: SimpleNamespace(DEBUG=True))
    assert import_documentation_reference.main(["--input", str(tmp_path / "missing.json")]) == 1
    bad_json = tmp_path / "invalid.json"
    bad_json.write_text("{", encoding="utf-8")
    assert import_documentation_reference.main(["--input", str(bad_json)]) == 1
    source = tmp_path / "reference.json"
    source.write_text(json.dumps(payload), encoding="utf-8")
    user.rol = "aprendiz"
    db.commit()
    assert import_documentation_reference.main(["--input", str(source)]) == 1
    assert db.query(Proyecto).count() == 0


@pytest.mark.parametrize("legacy", ["missing_snapshot", "missing_tables"])
def test_cli_repairs_legacy_documentation_schema_before_import(database, payload, tmp_path, monkeypatch, legacy):
    from types import SimpleNamespace
    from scripts import import_documentation_reference

    engine, db, user = database
    owner_id = user.id
    existing = Proyecto(nombre="Proyecto existente", owner_id=owner_id)
    db.add(existing)
    db.flush()
    existing_id = existing.id
    if legacy == "missing_snapshot":
        db.add(ProjectDocumentation(proyecto_id=existing_id, updated_by=owner_id,
                                    revision=3, datos={"centro": "Centro conservado"}))
    db.commit()
    db.rollback()
    with engine.begin() as connection:
        if legacy == "missing_snapshot":
            connection.execute(text("ALTER TABLE project_documentation DROP COLUMN fuente_snapshot"))
        else:
            for table in ("project_document_versions", "project_document_drafts", "project_documentation"):
                connection.execute(text("DROP TABLE " + table))
    source = tmp_path / "reference.json"
    source.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(import_documentation_reference, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setattr(import_documentation_reference, "get_settings", lambda: SimpleNamespace(DEBUG=True))
    assert import_documentation_reference.main(["--input", str(source), "--owner-id", str(owner_id)]) == 0
    assert "fuente_snapshot" in {column["name"] for column in inspect(engine).get_columns("project_documentation")}
    assert db.query(Proyecto).count() == 2
    assert db.query(ProjectDocumentDraft).count() == 6
    imported = db.query(Proyecto).filter(Proyecto.id != existing_id).one()
    assert db.get(ProjectDocumentation, imported.id).fuente_snapshot == payload
    if legacy == "missing_snapshot":
        preserved = db.get(ProjectDocumentation, existing_id)
        assert preserved.revision == 3 and preserved.datos == {"centro": "Centro conservado"}
        assert preserved.fuente_snapshot is None


@pytest.mark.parametrize("change", ["sources_empty", "source_not_object", "path_wrong", "path_traversal", "path_duplicate", "malformed_row"])
def test_source_identity_and_row_validation_roll_back(database, payload, change):
    _, db, user = database
    if change == "sources_empty":
        payload["source_blocks"] = []
    elif change == "source_not_object":
        payload["source_blocks"] = ["example"]
    elif change == "path_wrong":
        payload["source_blocks"][0]["path"] = "docs/example.docx"
    elif change == "path_traversal":
        payload["source_blocks"][0]["path"] = payload["source_directory"] + "/../example.docx"
    elif change == "path_duplicate":
        payload["source_blocks"].append(copy.deepcopy(payload["source_blocks"][0]))
    else:
        payload["examples"]["acta_inicio"]["equipo"] = ["example"]
    with pytest.raises(ReferenceImportError):
        import_reference_data(db, user, payload)
    assert db.query(Proyecto).count() == 0


def test_missing_optional_sections_and_partial_dates_remain_pending(database, payload):
    _, db, user = database
    start = payload["examples"]["acta_inicio"]
    start["fecha_inicio_textual"] = "febrero de 2026"
    start["fecha_fin_textual"] = None
    start["equipo"] = None
    start["valor_total_cop"] = None
    payload["examples"] = {"acta_inicio": start}
    result = import_reference_data(db, user, payload)
    project = db.get(Proyecto, result["proyecto_id"])
    assert project.año is None and project.año_fin is None
    assert project.presupuesto_total is None
    assert db.get(ProjectDocumentation, project.id).datos["fecha_inicio"] == ""
    assert db.query(ProjectDocumentDraft).count() == 1


def test_validation_error_rolls_back_and_private_reference_blocks_other_investigator(database, payload):
    from fastapi import HTTPException

    _, db, user = database
    invalid = copy.deepcopy(payload)
    invalid["examples"]["acta_inicio"]["centro"] = "x" * 2001
    with pytest.raises(HTTPException) as rejected:
        import_reference_data(db, user, invalid)
    assert rejected.value.status_code == 422
    assert db.query(Proyecto).count() == 0
    import_reference_data(db, user, payload)
    other = User(email="other@example.com", nombre="Otra persona", password_hash="example", rol="investigador", is_active=True)
    db.add(other)
    db.commit()
    with pytest.raises(ReferenceImportError, match="privada"):
        import_reference_data(db, other, payload)
    assert db.query(Proyecto).count() == 1


def test_reference_identity_remains_stable_after_real_sqlite_reload(database, payload):
    _, db, user = database
    user_id = user.id
    first = import_reference_data(db, user, payload)
    assert first["creado"] is True
    db.expunge_all()
    reloaded_user = db.get(User, user_id)
    repeated = import_reference_data(db, reloaded_user, payload)
    assert repeated["creado"] is False and repeated["proyecto_id"] == first["proyecto_id"]
    assert db.query(Proyecto).count() == 1 and db.query(ProjectDocumentDraft).count() == 6
    assert db.get(ProjectDocumentation, first["proyecto_id"]).fuente_snapshot == payload


def test_presentation_objectives_are_preserved_in_reference_core_and_real_docx_and_pptx(database, payload):
    _, db, user = database
    source = payload["examples"]["presentacion_proyecto"]
    source["objetivo_general"] = "Organizar archivos mediante estrategias pedagógicas verificables en el proyecto sintético."
    source["objetivos_especificos"] = [
        "Identificar las series documentales del expediente sintético.",
        "Diagnosticar las condiciones de conservación del archivo sintético.",
        "Clasificar los documentos mediante criterios acordados en el proyecto sintético.",
        "Describir las unidades documentales del archivo sintético.",
        "Verificar el inventario contra los soportes del proyecto sintético.",
        "Evaluar la recuperación de documentos del expediente sintético.",
    ]
    result = import_reference_data(db, user, payload)
    project = db.get(Proyecto, result["proyecto_id"])
    assert project.objetivo_general == source["objetivo_general"]
    assert project.objetivos_especificos == source["objetivos_especificos"]
    common = db.get(ProjectDocumentation, project.id)
    assert common.fuente_snapshot == payload
    for kind in ("formulacion_proyecto", "presentacion_proyecto"):
        draft = db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id, clave=kind).one()
        content, _ = render_document(kind, project_context(project), common.datos, draft.datos)
        with ZipFile(io.BytesIO(content)) as office:
            parts = [name for name in office.namelist() if name == "word/document.xml"
                     or name.startswith("ppt/slides/slide") and name.endswith(".xml")]
            texts = [" ".join(" ".join(ElementTree.fromstring(office.read(name)).itertext()).split()) for name in parts]
            for objective in [source["objetivo_general"], *source["objetivos_especificos"]]:
                assert any(objective in text for text in texts), (kind, objective)


@pytest.mark.parametrize("presentation", [None, {}, {"objetivo_general": "", "objetivos_especificos": []}])
def test_reference_objectives_fall_back_only_when_presentation_does_not_supply_them(database, payload, presentation):
    _, db, user = database
    if presentation is None:
        del payload["examples"]["presentacion_proyecto"]
    else:
        payload["examples"]["presentacion_proyecto"] = presentation
    result = import_reference_data(db, user, payload)
    project = db.get(Proyecto, result["proyecto_id"])
    assert project.objetivo_general == payload["examples"]["acta_inicio"]["objetivo_general"]
    assert project.objetivos_especificos == []
    assert db.get(ProjectDocumentation, project.id).fuente_snapshot == payload


def test_cli_reports_reference_and_database_errors_without_partial_import(database, payload, tmp_path, monkeypatch, capsys):
    from types import SimpleNamespace
    from scripts import import_documentation_reference

    engine, db, _ = database
    monkeypatch.setattr(import_documentation_reference, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setattr(import_documentation_reference, "get_settings", lambda: SimpleNamespace(DEBUG=True))
    source = tmp_path / "reference.json"
    payload["source_directory"] = "docs/example"
    source.write_text(json.dumps(payload), encoding="utf-8")
    assert import_documentation_reference.main(["--input", str(source)]) == 1
    assert "referencia" in capsys.readouterr().out
    assert db.query(Proyecto).count() == 0
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE users"))
    assert import_documentation_reference.main(["--input", str(source)]) == 1
    assert "conexión" in capsys.readouterr().out


def test_script_entrypoint_enforces_debug_without_opening_database(monkeypatch):
    import runpy
    import sys
    from types import SimpleNamespace
    from app import config

    monkeypatch.setattr(config, "get_settings", lambda: SimpleNamespace(DEBUG=False))
    monkeypatch.setattr(sys, "argv", ["import_documentation_reference.py", "--input", "example.json"])
    monkeypatch.delitem(sys.modules, "scripts.import_documentation_reference", raising=False)
    with pytest.raises(SystemExit) as exit_result:
        runpy.run_module("scripts.import_documentation_reference", run_name="__main__")
    assert exit_result.value.code == 1


@pytest.mark.parametrize("value,expected", [(None, ""), (True, ""), ("NaN", ""), ("-1", ""), ("$10.000,50", "10000.50"), ("Honorarios", "")])
def test_amount_adapter_does_not_invent_or_accept_invalid_numeric_values(value, expected):
    from app.services.reference_documentation_import import _amount
    assert _amount(value) == expected
