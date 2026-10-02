import uuid
from datetime import date
import pytest
from fastapi import BackgroundTasks
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.routers import entregables as entregables_router
from app.schemas import EntregableCreate, EntregableUpdate, empty_str_to_none
from db_support import db_path_for, sqlite_url_for


def test_empty_str_to_none_helper():
    assert empty_str_to_none("") is None
    assert empty_str_to_none(None) is None
    assert empty_str_to_none("valid-value") == "valid-value"


@pytest.fixture
def entregables_db(tmp_path):
    engine = create_engine(
        sqlite_url_for(db_path_for(f"entregables-val-{tmp_path.name}.db")),
        connect_args={"check_same_thread": False},
    )
    models.Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_entregable_create_accepts_empty_string_for_optional_uuids():
    proj_id = uuid.uuid4()
    # Before the fix, responsable_id="" raised a 422 / ValidationError
    payload = EntregableCreate(
        fase="Fase I",
        titulo="Entregable 1 - Formato",
        descripcion="formato",
        tipo="documento",
        fecha_entrega=date(2026, 10, 1),
        proyecto_id=proj_id,
        responsable_id="",
        producto_id="",
    )
    assert payload.responsable_id is None
    assert payload.producto_id is None
    assert payload.proyecto_id == proj_id


def test_entregable_update_accepts_empty_string_for_optional_uuids():
    payload = EntregableUpdate(
        responsable_id="",
        producto_id="",
    )
    assert payload.responsable_id is None
    assert payload.producto_id is None


def test_crear_entregable_with_empty_responsable_creates_record(entregables_db):
    owner = models.User(
        id=str(uuid.uuid4()),
        email="coord@sennova.edu.co",
        nombre="Coordinador",
        rol="admin",
        password_hash="hash",
    )
    proyecto = models.Proyecto(
        id=str(uuid.uuid4()),
        nombre="IoT Bocadillo",
        owner_id=owner.id,
        estado="Aprobado",
    )
    entregables_db.add_all([owner, proyecto])
    entregables_db.commit()

    create_data = EntregableCreate(
        fase="Fase I",
        titulo="Entregable 1 - Formato",
        descripcion="formato",
        tipo="documento",
        fecha_entrega=date(2026, 10, 1),
        proyecto_id=uuid.UUID(proyecto.id),
        responsable_id="",
    )

    bg_tasks = BackgroundTasks()
    res = entregables_router.crear_entregable(
        data=create_data,
        background_tasks=bg_tasks,
        current_user=owner,
        db=entregables_db,
    )

    assert res["titulo"] == "Entregable 1 - Formato"
    assert res["responsable_id"] is None
    assert res["proyecto_id"] == str(proyecto.id)

    db_item = entregables_db.query(models.Entregable).filter_by(id=res["id"]).first()
    assert db_item is not None
    assert db_item.responsable_id is None


def test_router_handles_post_with_and_without_trailing_slash():
    routes = [r.path for r in entregables_router.router.routes if "POST" in getattr(r, "methods", set())]
    assert "/entregables" in routes
    assert "/entregables/" in routes
