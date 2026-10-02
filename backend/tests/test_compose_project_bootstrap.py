"""Contratos del primer despliegue: inicialización compatible y catálogo incluido."""

from pathlib import Path


def test_alpine_database_initialization_uses_supported_icu_locale():
    root = Path(__file__).resolve().parents[2]
    compose = (root / "docker-compose.yml").read_text(encoding="utf-8")
    assert "image: postgres:16-alpine" in compose
    assert '--locale-provider=icu --icu-locale=es-CO --encoding=UTF8' in compose
    assert '--locale=es_CO.UTF-8' not in compose


def test_container_bootstrap_includes_non_destructive_catalog_before_server_start():
    root = Path(__file__).resolve().parents[2]
    script = (root / "backend/scripts/bootstrap_initial_data.py").read_text(encoding="utf-8")
    entrypoint = (root / "backend/entrypoint.sh").read_text(encoding="utf-8")
    assert "ensure_research_catalog(db)" in script
    assert entrypoint.index("python scripts/bootstrap_initial_data.py") < entrypoint.index('exec "$@"')
    assert "seed_database.py" not in entrypoint


def test_database_service_provides_network_aliases():
    root = Path(__file__).resolve().parents[2]
    compose = (root / "docker-compose.yml").read_text(encoding="utf-8")
    assert "postgres-db" in compose


def test_compose_defines_coolify_network_and_attaches_frontend():
    import yaml
    root = Path(__file__).resolve().parents[2]
    compose_content = (root / "docker-compose.yml").read_text(encoding="utf-8")
    compose_data = yaml.safe_load(compose_content)

    assert "networks" in compose_data
    assert "coolify" in compose_data["networks"]
    assert compose_data["networks"]["coolify"].get("external") is True

    frontend_networks = compose_data["services"]["sennova-frontend"]["networks"]
    assert "coolify" in frontend_networks
    assert "sennova-net" in frontend_networks


