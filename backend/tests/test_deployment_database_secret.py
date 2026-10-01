import json
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def test_compose_requires_database_password_for_postgres_and_backup():
    compose = (REPOSITORY_ROOT / "docker-compose.yml").read_text(encoding="utf-8")

    required_password = 'POSTGRES_PASSWORD: "${DB_PASSWORD:?Configura DB_PASSWORD en el entorno seguro}"'
    required_seed_password = 'DB_PASSWORD: "${DB_PASSWORD:?Configura DB_PASSWORD en el entorno seguro}"'
    assert compose.count(required_password) == 2
    assert compose.count(required_seed_password) == 1


def test_coolify_requires_database_password_without_a_default_secret():
    config = json.loads((REPOSITORY_ROOT / "coolify.json").read_text(encoding="utf-8"))
    db_password = next(
        variable for variable in config["env_variables"] if variable["name"] == "DB_PASSWORD"
    )

    assert db_password["required"] is True
    assert "default" not in db_password
