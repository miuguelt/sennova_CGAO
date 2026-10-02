"""Shared pytest setup for the SENNOVA backend suite.

The suite supplies an ephemeral admin password before test modules import the
application, so startup tests do not depend on a deployment secret or local
``.env`` file. The per-run database directory is removed after the session so
no ``test_*.db`` file is left behind in the repository.
"""

import os
import secrets

import pytest

from db_support import cleanup_test_db_dir

os.environ["INITIAL_ADMIN_PASSWORD"] = secrets.token_urlsafe(24)


@pytest.fixture(scope="session", autouse=True)
def _isolated_test_databases():
    yield
    # Engines still hold open handles on Windows; ignore_errors keeps a locked
    # file from failing an otherwise green run.
    cleanup_test_db_dir()
