"""Las rutas de la función de bitácoras ya no forman parte de la API."""

import os


# Solo se inspecciona el registro de rutas; SQLite en memoria evita depender
# del driver o de una conexión a PostgreSQL durante la colección.
os.environ.setdefault("DATABASE_URL", "sqlite://")

from app.main import app  # noqa: E402


def test_bitacora_routes_are_not_registered():
    paths = [
        route.path.lower()
        for route in app.routes
        if getattr(route, "path", None)
    ]

    assert not [path for path in paths if "bitacora" in path]
