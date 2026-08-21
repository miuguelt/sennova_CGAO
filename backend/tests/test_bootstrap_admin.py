# -*- coding: utf-8 -*-
"""Contrato del bootstrap del administrador inicial.

El despliegue crea el primer administrador a partir de variables de entorno.
Estas pruebas fijan lo que ese arranque debe garantizar: nunca publicar un
administrador sin contraseña utilizable, no duplicar administradores y no tocar
las credenciales de uno que ya existe.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.bootstrap import (
    AdminBootstrapError,
    InitialAdminCredentials,
    ensure_initial_admin,
)
from app.auth import verify_password, get_password_hash
from app.database import Base
from app.models import User

from db_support import db_path_for, sqlite_url_for

SQLALCHEMY_DATABASE_URL = sqlite_url_for(db_path_for("test_bootstrap_admin.db"))
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Valor de prueba, no una credencial: solo debe superar la longitud mínima.
VALID_PASSWORD = "changeme-clave-de-prueba"


def _credentials(**overrides) -> InitialAdminCredentials:
    data = {
        "email": "admin@sena.edu.co",
        "password": VALID_PASSWORD,
        "nombre": "Administrador SENNOVA",
        "documento": "admin01",
        "sede": "CGAO",
    }
    data.update(overrides)
    return InitialAdminCredentials(**data)


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_contrasena_vacia_no_crea_administrador(db):
    """Sin INITIAL_ADMIN_PASSWORD el arranque falla en vez de publicar un admin abierto."""
    with pytest.raises(AdminBootstrapError) as exc:
        ensure_initial_admin(db, _credentials(password=""))

    assert "INITIAL_ADMIN_PASSWORD" in str(exc.value)
    assert db.query(User).count() == 0


def test_contrasena_debil_rechazada_en_produccion(db):
    with pytest.raises(AdminBootstrapError) as exc:
        ensure_initial_admin(db, _credentials(password="123456"))

    assert "12" in str(exc.value)
    assert db.query(User).count() == 0


def test_contrasena_debil_permitida_en_desarrollo(db):
    result = ensure_initial_admin(
        db, _credentials(password="123456"), enforce_strong_password=False
    )

    assert result.created is True
    assert db.query(User).count() == 1


def test_crea_administrador_con_credenciales_validas(db):
    result = ensure_initial_admin(db, _credentials())

    assert result.created is True
    admin = db.query(User).filter(User.email == "admin@sena.edu.co").one()
    assert admin.rol == "admin"
    assert admin.is_active is True
    assert admin.documento == "admin01"
    assert admin.sede == "CGAO"
    assert verify_password(VALID_PASSWORD, admin.password_hash)


def test_es_idempotente_y_no_reescribe_la_contrasena(db):
    ensure_initial_admin(db, _credentials())
    hash_original = db.query(User).one().password_hash

    result = ensure_initial_admin(db, _credentials(password="changeme-otra-clave-distinta"))

    assert result.created is False
    assert db.query(User).count() == 1
    assert db.query(User).one().password_hash == hash_original


def test_no_crea_un_segundo_administrador_si_ya_existe_otro(db):
    db.add(
        User(
            email="coordinador@sena.edu.co",
            password_hash=get_password_hash(VALID_PASSWORD),
            nombre="Coordinador CGAO",
            rol="admin",
            is_active=True,
        )
    )
    db.commit()

    result = ensure_initial_admin(db, _credentials())

    assert result.created is False
    assert db.query(User).filter(User.rol == "admin").count() == 1


def test_documento_ocupado_produce_error_accionable(db):
    db.add(
        User(
            email="investigador@sena.edu.co",
            password_hash=get_password_hash(VALID_PASSWORD),
            nombre="Investigador",
            rol="investigador",
            documento="admin01",
            is_active=True,
        )
    )
    db.commit()

    with pytest.raises(AdminBootstrapError) as exc:
        ensure_initial_admin(db, _credentials())

    assert "INITIAL_ADMIN_DOCUMENTO" in str(exc.value)
    assert db.query(User).filter(User.rol == "admin").count() == 0
