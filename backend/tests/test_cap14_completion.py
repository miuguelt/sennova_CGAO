"""Compleción de una referencia privada con datos propuestos y archivos reales."""

import copy
import json
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.documentation_models import ProjectDocumentVersion
from app.models import Entregable, Producto
from app.services.documentation_commands import generate_version, review_version
from app.services.documentation_state import documentation_view
from app.services.reference_documentation_import import import_reference_data
from test_reference_documentation_import import database


@pytest.fixture
def cap14(database):
    _, db, user = database
    payload = json.loads((Path(__file__).parent / "fixtures/cap14_reference_validation.json").read_text(encoding="utf-8"))
    result = import_reference_data(db, user, payload)
    return db, user, result["proyecto_id"], payload


def test_complete_reference_all_forms_generate_without_claiming_approval(cap14, tmp_path, monkeypatch):
    from app.config import get_settings
    from app.models import Proyecto
    from app.services.cap14_reference_completion import complete_cap14_reference

    db, user, identifier, payload = cap14
    monkeypatch.setattr(get_settings(), "STORAGE_DIR", str(tmp_path))
    result = complete_cap14_reference(db, user, identifier)
    project = db.get(Proyecto, identifier)
    view = documentation_view(project, db)
    assert result["actualizado"] is True
    assert project.estado == "Referencia" and project.codigo_sgps is None and not project.is_publico
    assert project.documentacion.fuente_snapshot == payload
    assert project.modificaciones_log[-1]["antes"]["comunes"]["fecha_fin"] == "2026-12-23"
    assert len(view["documentos"]) == 13
    assert all(item["generable"] and not item["faltantes"] for item in view["documentos"])
    assert view["avance_documental"]["porcentaje_captura"] == 100
    assert view["advertencias"] and "validación" in view["comunes"]["inconsistencias_fuente"]
    from app.services.cap14_reference_content import NOTICE
    assert view["comunes"]["inconsistencias_fuente"] == NOTICE
    assert all(NOTICE not in item["datos"].get("observaciones", "") for item in view["documentos"])
    assert sum(float(row["valor_planeado"]) for row in view["comunes"]["presupuesto"]) == project.presupuesto_total
    assert project.entregables.count() == 6 and all(row.estado == "pendiente" for row in project.entregables)
    assert len(project.productos) == 2 and all(not row.is_verificado for row in project.productos)
    for item in view["documentos"]:
        version = generate_version(project, db, user, item["clave"], item["revision"], view["revision"])
        stored = db.query(ProjectDocumentVersion).filter_by(documento_id=version["documento_id"]).one()
        assert Path(stored.documento.file_path).is_file()
        assert stored.estado == "borrador" and stored.sha256
        with pytest.raises(HTTPException) as caught:
            review_version(project, db, user, version["documento_id"], "Revisión de prueba")
        assert caught.value.status_code == 422


def test_repeating_completion_preserves_edits_and_does_not_duplicate(cap14):
    from app.models import Proyecto
    from app.services.cap14_reference_completion import complete_cap14_reference

    db, user, identifier, _ = cap14
    complete_cap14_reference(db, user, identifier)
    project = db.get(Proyecto, identifier)
    data = copy.deepcopy(project.documentacion.datos)
    data["responsable"] = "Responsable actualizado por el usuario"
    project.documentacion.datos = data
    db.commit()
    result = complete_cap14_reference(db, user, identifier)
    assert result["actualizado"] is False
    assert project.documentacion.datos["responsable"] == data["responsable"]
    assert db.query(Producto).count() == 2 and db.query(Entregable).count() == 6


def test_completion_rejects_wrong_project_and_unauthorized_actor(cap14):
    from app.models import Proyecto
    from app.services.cap14_reference_completion import complete_cap14_reference

    db, user, identifier, _ = cap14
    user.rol = "aprendiz"
    db.commit()
    with pytest.raises(HTTPException) as error:
        complete_cap14_reference(db, user, identifier)
    assert error.value.status_code == 403
    user.rol = "admin"
    project = db.get(Proyecto, identifier)
    project.estado = "En ejecución"
    db.commit()
    with pytest.raises(HTTPException) as error:
        complete_cap14_reference(db, user, identifier)
    assert error.value.status_code == 422
    assert db.query(Producto).count() == 0


def test_completion_rolls_back_all_writes_on_commit_failure(cap14, monkeypatch):
    from app.models import Proyecto
    from app.services.cap14_reference_completion import complete_cap14_reference

    db, user, identifier, _ = cap14
    before = copy.deepcopy(db.get(Proyecto, identifier).documentacion.datos)
    def fail_commit():
        raise SQLAlchemyError("fallo controlado")
    monkeypatch.setattr(db, "commit", fail_commit)
    with pytest.raises(HTTPException) as error:
        complete_cap14_reference(db, user, identifier)
    assert error.value.status_code == 500
    assert db.query(Producto).count() == 0 and db.query(Entregable).count() == 0
    assert db.get(Proyecto, identifier).documentacion.datos == before
