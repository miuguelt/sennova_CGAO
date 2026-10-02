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

