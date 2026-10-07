"""Las relaciones entre proyecto, semillero, responsable y apoyos son coherentes."""

import os
import secrets
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(48))

from app.auth import get_current_user
from app.database import get_db
from app.main import app
from app.models import Aprendiz, Base, Grupo, Semillero, User, semillero_investigadores


def hierarchy_context():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    admin = User(
        id=str(uuid.uuid4()), email="admin-hierarchy@example.org", nombre="Admin",
        password_hash="example", rol="admin", is_active=True,
    )
    investigator = User(
        id=str(uuid.uuid4()), email="investigator-hierarchy@example.org", nombre="Investigadora",
        password_hash="example", rol="investigador", is_active=True,
    )
    other_investigator = User(
        id=str(uuid.uuid4()), email="other-hierarchy@example.org", nombre="Otro investigador",
        password_hash="example", rol="investigador", is_active=True,
    )
    apprentice = User(
        id=str(uuid.uuid4()), email="apprentice-hierarchy@example.org", nombre="Aprendiz",
        password_hash="example", rol="aprendiz", is_active=True,
    )
    other_apprentice = User(
        id=str(uuid.uuid4()), email="other-apprentice-hierarchy@example.org", nombre="Otra aprendiz",
        password_hash="example", rol="aprendiz", is_active=True,
    )
    db.add_all([admin, investigator, other_investigator, apprentice, other_apprentice])
    db.flush()
    group = Grupo(nombre="Investigadores CGAO", owner_id=admin.id)
    db.add(group)
    db.flush()
    first_seedbed = Semillero(nombre="Semillero Uno", grupo_id=group.id, owner_id=admin.id)
    second_seedbed = Semillero(nombre="Semillero Dos", grupo_id=group.id, owner_id=admin.id)
    db.add_all([first_seedbed, second_seedbed])
    db.flush()
    db.execute(semillero_investigadores.insert().values(
        semillero_id=first_seedbed.id, user_id=investigator.id,
        rol_en_semillero="Investigador responsable",
    ))
    db.execute(semillero_investigadores.insert().values(
        semillero_id=second_seedbed.id, user_id=other_investigator.id,
        rol_en_semillero="Investigador responsable",
    ))
    db.add_all([
        Aprendiz(user_id=apprentice.id, semillero_id=first_seedbed.id, estado="activo"),
        Aprendiz(user_id=other_apprentice.id, semillero_id=second_seedbed.id, estado="activo"),
    ])
    db.commit()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: admin
    return engine, db, admin, investigator, other_investigator, apprentice, other_apprentice, first_seedbed, second_seedbed


def close_hierarchy_context(context):
    app.dependency_overrides.clear()
    context[1].close()
    context[0].dispose()


def test_project_creation_requires_seedbed_and_investigator_responsible():
    context = hierarchy_context()
    try:
        client = TestClient(app)
        response = client.post("/proyectos", json={"nombre": "Proyecto sin semillero"})
        assert response.status_code == 422
        assert "semillero_id" in response.text
    finally:
        close_hierarchy_context(context)


def test_project_responsible_and_supporters_must_belong_to_selected_seedbed():
    context = hierarchy_context()
    try:
        _, db, _, investigator, other_investigator, apprentice, other_apprentice, first_seedbed, _ = context
        client = TestClient(app)
        base = {"nombre": "Proyecto coherente", "semillero_id": str(first_seedbed.id)}

        wrong_owner = client.post("/proyectos", json={
            **base, "investigador_responsable_id": str(other_investigator.id),
        })
        assert wrong_owner.status_code == 422
        assert "semillero" in wrong_owner.json()["detail"].lower()

        wrong_supporter = client.post("/proyectos", json={
            **base,
            "investigador_responsable_id": str(investigator.id),
            "equipo": [{"user_id": str(other_apprentice.id)}],
        })
        assert wrong_supporter.status_code == 422
        assert "semillero" in wrong_supporter.json()["detail"].lower()

        duplicate_responsible = client.post("/proyectos", json={
            **base,
            "investigador_responsable_id": str(investigator.id),
            "equipo": [{"user_id": str(investigator.id)}],
        })
        assert duplicate_responsible.status_code == 422
        assert "responsable" in duplicate_responsible.json()["detail"].lower()
        assert db.query(Semillero).count() == 2

        created = client.post("/proyectos", json={
            **base,
            "investigador_responsable_id": str(investigator.id),
            "equipo": [{"user_id": str(apprentice.id), "rol_en_proyecto": "Aprendiz de apoyo"}],
        })
        assert created.status_code == 201, created.text
        project = created.json()
        assert project["owner_id"] == str(investigator.id)
        assert project["grupo_id"] == str(first_seedbed.grupo_id)
        assert [member["id"] for member in project["equipo"]] == [str(apprentice.id)]
    finally:
        close_hierarchy_context(context)


def test_investigator_can_be_default_responsible_only_in_their_seedbed():
    context = hierarchy_context()
    try:
        _, _, _, investigator, _, _, _, first_seedbed, second_seedbed = context
        app.dependency_overrides[get_current_user] = lambda: investigator
        client = TestClient(app)

        valid = client.post("/proyectos", json={
            "nombre": "Proyecto de la investigadora", "semillero_id": str(first_seedbed.id),
        })
        assert valid.status_code == 201, valid.text
        assert valid.json()["owner_id"] == str(investigator.id)

        invalid = client.post("/proyectos", json={
            "nombre": "Proyecto de otro semillero", "semillero_id": str(second_seedbed.id),
        })
        assert invalid.status_code == 422
        assert "responsable" in invalid.json()["detail"].lower()
    finally:
        close_hierarchy_context(context)


def test_team_addition_and_seedbed_transfer_preserve_membership_rules():
    context = hierarchy_context()
    try:
        _, _, _, investigator, _, apprentice, other_apprentice, first_seedbed, second_seedbed = context
        client = TestClient(app)
        created = client.post("/proyectos", json={
            "nombre": "Proyecto con integrantes",
            "semillero_id": str(first_seedbed.id),
            "investigador_responsable_id": str(investigator.id),
        })
        assert created.status_code == 201, created.text
        project_id = created.json()["id"]

        duplicate_responsible = client.post(
            f"/proyectos/{project_id}/equipo", json={"user_id": str(investigator.id)}
        )
        assert duplicate_responsible.status_code == 422
        assert "responsable" in duplicate_responsible.json()["detail"].lower()

        valid_member = client.post(f"/proyectos/{project_id}/equipo", json={"user_id": str(apprentice.id)})
        assert valid_member.status_code == 200
        invalid_member = client.post(f"/proyectos/{project_id}/equipo", json={"user_id": str(other_apprentice.id)})
        assert invalid_member.status_code == 422

        transfer = client.put(f"/proyectos/{project_id}", json={"semillero_id": str(second_seedbed.id)})
        assert transfer.status_code == 422
        assert client.get(f"/proyectos/{project_id}").json()["semillero_id"] == str(first_seedbed.id)
    finally:
        close_hierarchy_context(context)


def test_architecture_document_matches_the_confirmed_project_hierarchy():
    repository_root = Path(__file__).resolve().parents[2]
    model_document = (repository_root / "docs/architecture/modelo-funcional-y-datos.md").read_text(encoding="utf-8")
    folder_document = (repository_root / "docs/architecture/expediente-proyectos.md").read_text(encoding="utf-8")

    assert "Investigadores CGAO" in model_document
    assert "investigador vinculado a ese semillero como responsable" in model_document
    assert "cada integrante investigador o aprendiz debe pertenecer al mismo semillero" in folder_document
    assert "7Borradoresyvarios" in folder_document


def test_semillero_membership_cannot_be_removed_while_a_project_still_uses_it():
    context = hierarchy_context()
    try:
        _, db, _, investigator, other_investigator, apprentice, _, first_seedbed, _ = context
        client = TestClient(app)
        created = client.post("/proyectos", json={
            "nombre": "Proyecto con integrantes vinculados",
            "semillero_id": str(first_seedbed.id),
            "investigador_responsable_id": str(investigator.id),
            "equipo": [{"user_id": str(apprentice.id)}],
        })
        assert created.status_code == 201, created.text
        project_id = created.json()["id"]
        apprentice_profile = db.query(Aprendiz).filter(Aprendiz.user_id == apprentice.id).one()

        researcher_removal = client.delete(
            f"/semilleros/{first_seedbed.id}/investigadores/{investigator.id}"
        )
        apprentice_removal = client.delete(f"/aprendices/{apprentice_profile.id}")
        assert researcher_removal.status_code == 409
        assert apprentice_removal.status_code == 409

        db.execute(semillero_investigadores.insert().values(
            semillero_id=first_seedbed.id, user_id=other_investigator.id,
            rol_en_semillero="Investigador",
        ))
        db.commit()
        added_as_support = client.post(
            f"/proyectos/{project_id}/equipo", json={"user_id": str(other_investigator.id)}
        )
        assert added_as_support.status_code == 200
        reassigned = client.put(f"/proyectos/{project_id}", json={
            "investigador_responsable_id": str(other_investigator.id),
        })
        assert reassigned.status_code == 200
        assert str(other_investigator.id) not in {member["id"] for member in reassigned.json()["equipo"]}
        assert client.delete(f"/semilleros/{first_seedbed.id}/investigadores/{investigator.id}").status_code == 200

        assert client.delete(f"/proyectos/{project_id}/equipo/{apprentice.id}").status_code == 200
        assert client.delete(f"/aprendices/{apprentice_profile.id}").status_code == 200
    finally:
        close_hierarchy_context(context)
