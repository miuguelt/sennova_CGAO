"""Per-run isolation for the SQLite databases used by the test suite.

Every test module used to hardcode a relative path such as ``./test_mensajes.db``.
Two pytest runs started from the same working directory therefore shared the very
same files: whichever process imported first deleted and recreated the schema
while the other one was already running queries against it, so a healthy suite
failed for reasons that had nothing to do with the code under test.

Each run now gets its own temporary directory. The path is published through the
``SENNOVA_TEST_DB_DIR`` environment variable so that every module in the same
process resolves to the same directory, while separate processes stay isolated.
"""

import os
import shutil
import tempfile

ENV_VAR = "SENNOVA_TEST_DB_DIR"


def resolve_db_dir() -> str:
    """Return this run's database directory, creating it on first use."""
    existing = os.environ.get(ENV_VAR)
    if existing and os.path.isdir(existing):
        return existing

    created = tempfile.mkdtemp(prefix="sennova-tests-")
    os.environ[ENV_VAR] = created
    return created


def db_path_for(filename: str) -> str:
    """Absolute path for a test database file inside this run's directory."""
    return os.path.join(resolve_db_dir(), filename)


def sqlite_url_for(path: str) -> str:
    """SQLAlchemy URL for a SQLite file.

    Windows paths carry backslashes, which SQLAlchemy does not accept in the
    URL form, so they are normalised to forward slashes.
    """
    return "sqlite:///" + path.replace("\\", "/")


def cleanup_test_db_dir() -> None:
    """Remove this run's directory. Safe to call when it was never created."""
    directory = os.environ.pop(ENV_VAR, None)
    if directory and os.path.isdir(directory):
        shutil.rmtree(directory, ignore_errors=True)
