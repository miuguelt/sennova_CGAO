"""Los porcentajes de grupo y perfil comparten el avance documental del proyecto."""

from datetime import date
from uuid import uuid4

import pytest

from app.auth import get_current_user
from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft
from app.main import app
from app.models import Entregable, Grupo, Proyecto, Semillero, User
from app.research_catalog import CANONICAL_GROUP_NAME
from test_project_documentation import complete_forms
from test_project_documentation import documentation_context as documentation_context


@pytest.fixture
def group_context(documentation_context):
    db, user, project, *_ = documentation_context
    group = Grupo(nombre=CANONICAL_GROUP_NAME, owner_id=user.id)
    db.add(group)
    db.flush()
    seedbed = Semillero(nombre="Semillero de documentación", grupo_id=group.id, owner_id=user.id)
    db.add(seedbed)
    db.flush()
    project.grupo_id, project.semillero_id = group.id, seedbed.id
    db.add(Entregable(proyecto_id=project.id, fase="Fase I", titulo="Entregable aprobado",
                      fecha_entrega=date(2026, 6, 30), estado="aprobado", responsable_id=user.id))
    db.commit()
    return documentation_context, group, seedbed


def test_group_and_profile_share_saved_documentation_progress_without_deliverable_fallback(group_context):
    ctx, group, _ = group_context
    db, user, project, _, _, client = ctx
    project.estado = "Finalizado"
    db.commit()
    editor = client.get(f"/proyectos/{project.id}/documentacion").json()["avance_documental"]
    group_stats = client.get(f"/grupos/{group.id}/stats")
    assert group_stats.status_code == 200
    stats = group_stats.json()
    assert stats["cumplimiento"] == stats["avance_promedio"] == editor["porcentaje"] < 100
    assert stats["avance_documental"]["porcentaje"] == editor["porcentaje"]
    assert stats["avance_documental"]["campos_completados"] == editor["campos_completados"]
    assert stats["entregables_totales"] == stats["entregables_aprobados"] == 1
    nested = client.get(f"/grupos/{group.id}/proyectos").json()
    assert len(nested) == 1 and nested[0]["avance_documental"] == editor
    profile = client.get(f"/stats/user/{user.id}/impact").json()
    assert profile["cumplimiento"] == editor["porcentaje"]
    assert profile["avance_documental"]["porcentaje"] == editor["porcentaje"]
    assert profile["proyectos_lista"][0]["progreso"] == editor["porcentaje"]
    assert profile["proyectos_lista"][0]["avance_documental"] == editor


def test_group_aggregates_counts_and_mean_only_for_linked_projects(group_context):
    ctx, group, seedbed = group_context
    db, user, _, _, _, client = ctx
    complete_forms(ctx)
    other = User(email="investigador-externo-documentacion@example.com", nombre="Investigador externo", password_hash="example", rol="investigador")
    db.add(other)
    db.flush()
    linked = Proyecto(nombre="Proyecto vinculado al semillero", owner_id=other.id, semillero_id=seedbed.id)
    excluded = Proyecto(nombre="Proyecto externo al grupo", owner_id=other.id)
    db.add_all([linked, excluded])
    db.commit()
    nested = client.get(f"/grupos/{group.id}/proyectos").json()
    assert len(nested) == 2
    assert str(excluded.id) not in {row["id"] for row in nested}
    progress = client.get(f"/grupos/{group.id}/stats").json()["avance_documental"]
    assert progress["proyectos_totales"] == 2
    assert progress["porcentaje"] == sum(row["avance_documental"]["porcentaje"] for row in nested) // 2
    for key in ("campos_completados", "campos_totales", "documentos_totales", "documentos_listos", "documentos_generados", "documentos_revisados"):
        assert progress[key] == sum(row["avance_documental"][key] for row in nested)


def test_empty_group_and_profile_have_zero_documentary_statistics(documentation_context):
    db, _, _, _, _, client = documentation_context
    other = User(email="perfil-sin-proyectos@example.com", nombre="Perfil sin proyectos", password_hash="example", rol="investigador")
    db.add(other)
    db.flush()
    group = Grupo(nombre=CANONICAL_GROUP_NAME, owner_id=other.id)
    db.add(group)
    db.commit()
    for url in (f"/grupos/{group.id}/stats", f"/stats/user/{other.id}/impact"):
        response = client.get(url)
        assert response.status_code == 200
        progress = response.json()["avance_documental"]
        assert progress["porcentaje"] == progress["porcentaje_captura"] == progress["campos_completados"] == progress["campos_totales"] == 0
        assert progress["documentos_totales"] == progress["documentos_generados"] == progress["documentos_revisados"] == progress["proyectos_totales"] == 0


def test_group_and_profile_permission_boundaries_are_preserved(group_context):
    ctx, group, _ = group_context
    db, user, _, _, _, client = ctx
    assert client.get(f"/grupos/{uuid4()}/stats").status_code == 404
    learner = User(email="aprendiz-estadisticas@example.com", nombre="Aprendiz de prueba", password_hash="example", rol="aprendiz")
    db.add(learner)
    db.commit()
    app.dependency_overrides[get_current_user] = lambda: learner
    assert client.get(f"/grupos/{group.id}/stats").status_code == 403
    assert client.get(f"/grupos/{group.id}/proyectos").status_code == 403
    assert client.get(f"/stats/user/{user.id}/impact").status_code == 403
    own = client.get(f"/stats/user/{learner.id}/impact")
    assert own.status_code == 200
    assert own.json()["avance_documental"]["proyectos_totales"] == 0


def test_group_projects_and_statistics_load_documentary_graph_in_batches(group_context):
    from sqlalchemy import event

    ctx, group, seedbed = group_context
    db, user, _, _, _, client = ctx
    for index in range(4):
        project = Proyecto(nombre=f"Proyecto documental {index}", owner_id=user.id, semillero_id=seedbed.id)
        db.add(project)
        db.flush()
        db.add(ProjectDocumentation(proyecto_id=project.id, revision=1, datos={"centro": "CGAO"}, updated_by=user.id))
        db.add(ProjectDocumentDraft(proyecto_id=project.id, clave="acta_inicio", tipo="acta_inicio", revision=1,
                                  datos={"temas": "Acuerdos guardados"}, updated_by=user.id))
    db.commit()
    group_id = str(group.id)
    statements = []

    def capture_statement(connection, cursor, statement, parameters, context, executemany):
        if any(f"FROM {table}" in statement for table in ("project_documentation", "project_document_drafts", "project_document_versions")):
            statements.append(statement)

    event.listen(db.get_bind(), "before_cursor_execute", capture_statement)
    try:
        for suffix in ("proyectos", "stats"):
            db.expire_all()
            statements.clear()
            response = client.get(f"/grupos/{group_id}/{suffix}")
            assert response.status_code == 200
            assert len(statements) == 3
            assert len(response.json()) == 5 if suffix == "proyectos" else response.json()["total_proyectos"] == 5
    finally:
        event.remove(db.get_bind(), "before_cursor_execute", capture_statement)
