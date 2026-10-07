"""Precarga y edición institucional con UUID y JSONB en PostgreSQL real."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from uuid import UUID

from test_project_evidence_postgres import postgres_context as postgres_context
from app.auth import get_current_user
from app.database import get_db
from app.documentation_models import ProjectDocumentation
from app.models import Grupo, Semillero, semillero_investigadores
from app.routers import proyectos, project_documentation


def test_new_project_general_data_are_persistent_and_editable_in_postgres(postgres_context):
    _, db, owner, _, _, _ = postgres_context
    group = Grupo(nombre="Grupo de la prueba", owner_id=owner.id)
    db.add(group)
    db.flush()
    seedbed = Semillero(nombre="Semillero de la prueba", owner_id=owner.id, grupo_id=group.id)
    db.add(seedbed)
    db.flush()
    db.execute(semillero_investigadores.insert().values(semillero_id=seedbed.id, user_id=owner.id))
    db.commit()
    application = FastAPI()
    application.include_router(proyectos.router)
    application.include_router(project_documentation.router)
    application.dependency_overrides[get_db] = lambda: db
    application.dependency_overrides[get_current_user] = lambda: owner
    client = TestClient(application)
    response = client.post("/proyectos", json={"nombre": "Proyecto con precarga", "semillero_id": str(seedbed.id)})
    assert response.status_code == 201, response.text
    assert response.json()["estado"] == "En formulación"
    assert response.json()["vigencia"] is None
    project_id = response.json()["id"]
    db.expire_all()
    common = client.get(f"/proyectos/{project_id}/documentacion").json()
    assert common["comunes"]["responsable"] == owner.nombre
    assert common["comunes"]["regional"] == "Santander"
    assert common["revision"] == 0
    assert common["opciones_relaciones"]["integrantes"] == [owner.nombre]
    assert common["ruta_formulacion"]["resumen"]["borrador_generado"] is False
    assert common["ruta_formulacion"]["resumen"]["revision_registrada"] is False
    updated = dict(common["comunes"], ciudad="Municipio confirmado")
    save = client.put(f"/proyectos/{project_id}/documentacion/comunes", json={"revision": 0, "datos": updated})
    assert save.status_code == 200 and save.json()["revision"] == 1
    row = db.query(ProjectDocumentation).filter_by(proyecto_id=UUID(project_id)).one()
    assert row.datos == updated
    stale = client.put(f"/proyectos/{project_id}/documentacion/comunes", json={"revision": 0, "datos": common["comunes"]})
    assert stale.status_code == 409
    assert client.get(f"/proyectos/{project_id}/documentacion").json()["comunes"] == updated
