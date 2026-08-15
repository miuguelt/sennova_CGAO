"""Shared pytest setup for the SENNOVA backend suite.

Its only job is lifecycle: the per-run database directory is created lazily by
``db_support`` when the first test module resolves a path, and removed here once
the session finishes so no ``test_*.db`` file is left behind in the repository.
"""

import pytest

from db_support import cleanup_test_db_dir


@pytest.fixture(scope="session", autouse=True)
def _isolated_test_databases():
    yield
    # Engines still hold open handles on Windows; ignore_errors keeps a locked
    # file from failing an otherwise green run.
    cleanup_test_db_dir()
