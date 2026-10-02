"""Credenciales obligatorias para utilidades de QA de Sennova."""

import os


def get_qa_credentials() -> dict[str, str]:
    """Obtiene las credenciales QA sin valores predeterminados inseguros."""
    email = os.getenv("SENNOVA_QA_EMAIL") or os.getenv("DEV_SEED_EMAIL") or ""
    password = os.getenv("SENNOVA_QA_PASSWORD") or os.getenv("DEV_SEED_PASSWORD") or ""
    if not email or not password:
        raise RuntimeError(
            "Define SENNOVA_QA_EMAIL y SENNOVA_QA_PASSWORD (o DEV_SEED_EMAIL y "
            "DEV_SEED_PASSWORD) antes de ejecutar esta utilidad QA."
        )
    return {"email": email, "password": password}


def get_qa_seed_password() -> str:
    """Obtiene la contraseña que las utilidades QA asignan a datos de prueba."""
    password = (
        os.getenv("SENNOVA_QA_SEED_PASSWORD")
        or os.getenv("SENNOVA_QA_PASSWORD")
        or os.getenv("DEV_TEST_PASSWORD")
        or ""
    )
    if not password:
        raise RuntimeError(
            "Define SENNOVA_QA_SEED_PASSWORD, SENNOVA_QA_PASSWORD o "
            "DEV_TEST_PASSWORD antes de crear cuentas de prueba."
        )
    return password
