"""El detalle del proyecto expone su planeación y entregables autorizados."""

from datetime import date

from app.documentation_models import ProjectDocumentation
from app.models import Entregable, Proyecto, User
from test_project_documentation import documentation_context


def test_project_detail_has_actual_timeline_and_documentary_plan(documentation_context):
    db, user, project, _, _, client = documentation_context
    db.add_all([
        Entregable(proyecto_id=project.id, fase="Fase Final", titulo="Cierre", fecha_entrega=date(2026, 6, 30), estado="pendiente"),
        Entregable(proyecto_id=project.id, fase="Fase I", titulo="Diagnóstico", fecha_entrega=date(2026, 3, 20), responsable_id=user.id, estado="aprobado"),
        ProjectDocumentation(proyecto_id=project.id, revision=1, updated_by=user.id, datos={"cronograma": [{"actividad": "Revisar", "encargado": "Equipo", "fecha_textual": "Mes 1", "resultado": "Inventario"}]})])
    db.commit()
    response = client.get(f"/proyectos/{project.id}")
    assert response.status_code == 200
    detail = response.json()
    assert [item["titulo"] for item in detail["entregables"]] == ["Diagnóstico", "Cierre"]
    assert detail["entregables"][0]["fase"] == "Fase I"
    assert detail["entregables"][0]["responsable_nombre"] == user.nombre
    assert detail["entregables"][1]["responsable_nombre"] is None
    assert detail["entregables"][0]["fecha_entrega"] == "2026-03-20"
    assert detail["cronograma_documental"][0]["resultado"] == "Inventario"
    assert detail["total_entregables"] == 2 and detail["entregables_aprobados"] == 1


def test_private_timeline_respects_project_access_and_empty_state(documentation_context):
    db, user, project, _, _, client = documentation_context
    response = client.get(f"/proyectos/{project.id}")
    assert response.status_code == 200
    assert response.json()["entregables"] == [] and response.json()["cronograma_documental"] == []
    outsider = User(email="otro@example.com", nombre="Otro investigador", rol="investigador", password_hash="example")
    db.add(outsider)
    db.flush()
    private = Proyecto(nombre="Proyecto privado", owner_id=outsider.id, is_publico=False)
    db.add(private)
    user.rol = "aprendiz"
    db.commit()
    denied = client.get(f"/proyectos/{private.id}")
    assert denied.status_code == 403 and "entregables" not in denied.json()


def test_gantt_planning_fields_round_trip_through_documentation_and_project_timeline(documentation_context):
    db, user, project, _, _, client = documentation_context
    documentation_url = f"/proyectos/{project.id}/documentacion"
    definition = client.get(documentation_url).json()
    schedule = next(field for field in definition["campos_comunes"] if field["key"] == "cronograma")
    fields = {field["key"]: field for field in schedule["columns"]}
    assert fields["fase"]["type"] == "select"
    assert {option["value"] for option in fields["fase"]["options"]} == {"Fase I", "Fase II", "Fase III", "Fase Final"}
    assert {"fecha_inicio", "fecha_fin", "hora_inicio", "hora_fin", "lugar"}.issubset(fields)
    assert all(fields[key]["required"] is False for key in ("fecha_inicio", "fecha_fin", "hora_inicio", "hora_fin", "lugar", "fecha_textual"))

    activity = {
        "fase": "Fase II", "actividad": "Validar el prototipo", "encargado": user.nombre,
        "fecha_inicio": "2026-10-01", "fecha_fin": "2026-10-05", "hora_inicio": "09:00", "hora_fin": "10:30",
        "lugar": "CGAO, Subsede Vélez", "fecha_textual": "1 a 5 de octubre de 2026", "resultado": "Acta de validación",
    }
    invalid_dates = dict(activity, fecha_fin="2026-09-30")
    rejected_dates = client.put(documentation_url + "/comunes", json={"revision": 0, "datos": {"cronograma": [invalid_dates]}})
    assert rejected_dates.status_code == 422
    invalid_time = dict(activity, hora_fin="08:30")
    rejected_time = client.put(documentation_url + "/comunes", json={"revision": 0, "datos": {"cronograma": [invalid_time]}})
    assert rejected_time.status_code == 422
    saved = client.put(documentation_url + "/comunes", json={"revision": 0, "datos": {"cronograma": [activity]}})
    assert saved.status_code == 200
    timeline = client.get(f"/proyectos/{project.id}")
    assert timeline.status_code == 200
    assert timeline.json()["cronograma_documental"] == [activity]
