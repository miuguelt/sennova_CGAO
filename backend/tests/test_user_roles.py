import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.auth import AuthService, get_current_staff
from app.models import User
from app.schemas import UserCreate


def test_user_creation_accepts_only_supported_platform_roles():
    base = {
        "email": "persona@sena.edu.co",
        "password": "clave-segura",
        "nombre": "Persona de prueba",
    }

    for role in ("admin", "investigador", "aprendiz"):
        assert UserCreate(**base, rol=role).rol == role

    with pytest.raises(ValidationError):
        UserCreate(**base, rol="instructor")


def test_user_service_rejects_the_removed_role_before_writing():
    class RollbackRecorder:
        was_rolled_back = False

        def rollback(self):
            self.was_rolled_back = True

    database = RollbackRecorder()

    with pytest.raises(HTTPException) as error:
        AuthService.register_user(
            database,
            email="docente@sena.edu.co",
            password="clave-segura",
            nombre="Docente SENNOVA",
            rol="instructor",
        )

    assert error.value.status_code == 422
    assert database.was_rolled_back is True


@pytest.mark.parametrize("role", ["aprendiz", "instructor"])
def test_staff_authorization_rejects_non_staff_roles(role):
    user = User(email=f"{role}@sena.edu.co", nombre="Persona", password_hash="", rol=role)

    with pytest.raises(HTTPException) as error:
        import asyncio
        asyncio.run(get_current_staff(user))

    assert error.value.status_code == 403
