"""Product metadata survives the real HTTP and database round trip."""

import os
import secrets
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = secrets.token_urlsafe(48)

from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models import Producto, User


@pytest.fixture
def product_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    user = User(id=str(uuid.uuid4()), nombre="Investigadora", email="metadata@example.test", rol="investigador", password_hash="test", is_active=True)
    session.add(user)
    session.commit()
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with TestClient(app) as client:
            yield client, session, user
    finally:
        app.dependency_overrides.clear()
        session.close()
        engine.dispose()


def test_metadata_survives_create_list_get_update(product_client):
    client, session, _ = product_client
    metadata = {"categoria": "B", "año_reporte": 2025, "requisitos_cumplidos": {"req0": True, "req1": False}}
    created = client.post("/productos", json={"tipo": "B1", "nombre": "Software de seguimiento", **metadata})
    assert created.status_code == 201, created.text
    product_id = created.json()["id"]
    assert all(created.json()[key] == value for key, value in metadata.items())
    session.expire_all()
    stored = session.get(Producto, product_id)
    assert all(getattr(stored, key) == value for key, value in metadata.items())
    fetched = client.get(f"/productos/{product_id}")
    assert fetched.status_code == 200
    assert all(fetched.json()[key] == value for key, value in metadata.items())
    listed = client.get("/productos")
    assert listed.status_code == 200
    assert all(listed.json()[0][key] == value for key, value in metadata.items())
    updated = {"categoria": "C", "año_reporte": 2026, "requisitos_cumplidos": {"req0": False}}
    response = client.put(f"/productos/{product_id}", json=updated)
    assert response.status_code == 200
    assert all(response.json()[key] == value for key, value in updated.items())
    cleared = client.put(f"/productos/{product_id}", json={"categoria": None, "año_reporte": None, "requisitos_cumplidos": {}})
    assert cleared.status_code == 200
    assert cleared.json()["categoria"] is None
    assert cleared.json()["año_reporte"] is None
    assert cleared.json()["requisitos_cumplidos"] == {}


def test_missing_metadata_is_not_fabricated(product_client):
    client, _, _ = product_client
    response = client.post("/productos", json={"tipo": "Informe Técnico", "nombre": "Informe por revisar"})
    assert response.status_code == 201
    for key in ["categoria", "año_reporte", "requisitos_cumplidos"]:
        assert key in response.json() and response.json()[key] is None


def test_product_metadata_cannot_be_modified_by_another_researcher(product_client):
    client, session, user = product_client
    product = Producto(nombre="Producto de otra persona", tipo="B1", categoria="B", año_reporte=2025, owner_id=str(uuid.uuid4()))
    session.add(product)
    session.commit()
    response = client.put(f"/productos/{product.id}", json={"año_reporte": 2026})
    assert response.status_code == 403
    session.refresh(product)
    assert product.año_reporte == 2025
    assert product.owner_id != user.id
