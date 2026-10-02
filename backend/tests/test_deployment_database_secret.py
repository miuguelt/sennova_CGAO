import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys

from app.config import Settings, validate_production_settings


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
REQUIRED_DEPLOYMENT_VARS = {"DB_PASSWORD", "JWT_SECRET", "INITIAL_ADMIN_PASSWORD"}

_SETUP_ENV_SPEC = importlib.util.spec_from_file_location(
    "sennova_setup_env", REPOSITORY_ROOT / "scripts" / "setup_env.py"
)
_SETUP_ENV_MODULE = importlib.util.module_from_spec(_SETUP_ENV_SPEC)
_SETUP_ENV_SPEC.loader.exec_module(_SETUP_ENV_MODULE)


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


def test_compose_and_coolify_require_only_the_three_deployment_secrets():
    compose = (REPOSITORY_ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    required_by_compose = set(re.findall(r"\$\{([A-Z][A-Z0-9_]*):\?", compose))
    assert required_by_compose == REQUIRED_DEPLOYMENT_VARS

    config = json.loads((REPOSITORY_ROOT / "coolify.json").read_text(encoding="utf-8-sig"))
    variables = config["env_variables"]
    assert {variable["name"] for variable in variables} == REQUIRED_DEPLOYMENT_VARS
    assert all(variable["required"] for variable in variables)
    assert all("default" not in variable for variable in variables)
    assert "pgadmin" not in config["services"]

    service_environment = {
        name: dict(entry.split("=", 1) for entry in service["environment"])
        for name, service in config["services"].items()
    }
    assert service_environment["postgres"]["POSTGRES_PASSWORD"] == "${DB_PASSWORD}"
    assert service_environment["backend"]["JWT_SECRET"] == "${JWT_SECRET}"
    assert service_environment["backend"]["INITIAL_ADMIN_PASSWORD"] == "${INITIAL_ADMIN_PASSWORD}"
    assert service_environment["backup"]["PGPASSWORD"] == "${DB_PASSWORD}"


def test_environment_examples_list_only_the_required_deployment_variables():
    for filename in (".env.example", ".env.production.example"):
        content = (REPOSITORY_ROOT / filename).read_text(encoding="utf-8")
        names = set(re.findall(r"(?m)^\s*([A-Z][A-Z0-9_]*)\s*=", content))
        assert names == REQUIRED_DEPLOYMENT_VARS

    frontend_example = (REPOSITORY_ROOT / "frontend" / ".env.example").read_text(
        encoding="utf-8"
    )
    assert not re.search(r"(?m)^\s*VITE_[A-Z0-9_]+\s*=", frontend_example)


def test_setup_env_adds_only_missing_required_names_and_preserves_other_settings(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("SMTP_HOST=mail.example\n", encoding="utf-8")
    result = _SETUP_ENV_MODULE.setup_env(tmp_path, input_fn=lambda _: "s")

    assert result is True
    content = env_file.read_text(encoding="utf-8")
    names = set(re.findall(r"(?m)^\s*([A-Z][A-Z0-9_]*)\s*=", content))
    assert names == REQUIRED_DEPLOYMENT_VARS | {"SMTP_HOST"}
    assert all(re.search(rf"(?m)^{name}=$", content) for name in REQUIRED_DEPLOYMENT_VARS)


def test_setup_env_leaves_complete_configuration_unchanged(tmp_path):
    env_file = tmp_path / ".env"
    values = {
        "DB_PASSWORD": secrets.token_urlsafe(16),
        "JWT_SECRET": secrets.token_urlsafe(32),
        "INITIAL_ADMIN_PASSWORD": secrets.token_urlsafe(16),
    }
    original = "\n".join(f"{name}={value}" for name, value in values.items()) + "\n"
    env_file.write_text(original, encoding="utf-8")

    assert _SETUP_ENV_MODULE.setup_env(tmp_path) is True
    assert env_file.read_text(encoding="utf-8") == original


def test_setup_env_cancellation_does_not_create_or_change_the_file(tmp_path):
    env_file = tmp_path / ".env"
    assert _SETUP_ENV_MODULE.setup_env(tmp_path, input_fn=lambda _: "n") is False
    assert not env_file.exists()


def test_environment_verifier_accepts_only_the_three_required_values(tmp_path):
    script_dir = tmp_path / "scripts"
    script_dir.mkdir()
    verifier = script_dir / "verify_env_config.py"
    shutil.copyfile(REPOSITORY_ROOT / "scripts" / "verify_env_config.py", verifier)
    values = {
        "DB_PASSWORD": secrets.token_urlsafe(16),
        "JWT_SECRET": secrets.token_urlsafe(32),
        "INITIAL_ADMIN_PASSWORD": secrets.token_urlsafe(16),
    }
    (tmp_path / ".env").write_text(
        "\n".join(f"{name}={value}" for name, value in values.items()) + "\n",
        encoding="utf-8",
    )
    child_env = os.environ.copy()
    for name in REQUIRED_DEPLOYMENT_VARS:
        child_env.pop(name, None)

    result = subprocess.run(
        [sys.executable, str(verifier)],
        cwd=tmp_path,
        env=child_env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert all(name in result.stdout for name in REQUIRED_DEPLOYMENT_VARS)
    assert "ALLOWED_ORIGINS" not in result.stdout
    assert all(value not in result.stdout for value in values.values())


def test_frontend_environment_check_accepts_defaults_without_an_env_file(tmp_path):
    script_dir = tmp_path / "scripts"
    (tmp_path / "frontend").mkdir(parents=True)
    script_dir.mkdir()
    script = script_dir / "test_frontend_env.js"
    shutil.copyfile(REPOSITORY_ROOT / "scripts" / "test_frontend_env.js", script)

    node = shutil.which("node")
    if node is None:
        raise AssertionError("Node.js se requiere para verificar los valores predeterminados del frontend")
    result = subprocess.run(
        [node, str(script)], cwd=tmp_path, capture_output=True, text=True, check=False
    )
    assert result.returncode == 0
    assert "no es obligatorio" in result.stdout
    assert "FALTAN VARIABLES REQUERIDAS" not in result.stdout


def test_settings_do_not_supply_a_default_jwt_secret():
    settings = Settings(
        _env_file=None,
        DB_PASSWORD="",
        JWT_SECRET="",
        DATABASE_URL="sqlite:///./test.db",
        DEBUG=True,
    )

    assert settings.DB_PASSWORD == ""
    assert settings.JWT_SECRET == ""
    try:
        validate_production_settings(settings)
    except ValueError as error:
        assert "JWT_SECRET" in str(error)
    else:
        raise AssertionError("La configuración debe rechazar una clave JWT ausente")


def test_production_settings_reject_sqlite_without_a_database_secret():
    settings = Settings(
        _env_file=None,
        DB_PASSWORD="",
        JWT_SECRET=secrets.token_urlsafe(32),
        DATABASE_URL="sqlite:///./test.db",
        DEBUG=False,
    )

    try:
        validate_production_settings(settings)
    except ValueError as error:
        assert "PostgreSQL" in str(error)
    else:
        raise AssertionError("Producción debe requerir una conexión a PostgreSQL")
