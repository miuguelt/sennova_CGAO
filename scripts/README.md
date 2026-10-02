# Utilidades de prueba de Sennova

Las pruebas y los semilleros de esta carpeta requieren una cuenta QA local o de pruebas. Defina `SENNOVA_QA_EMAIL` y `SENNOVA_QA_PASSWORD` en el entorno del proceso. Para asignar contraseñas a cuentas que creen `seed_data.py` o `test_completo_crud.py`, defina `SENNOVA_QA_SEED_PASSWORD`.

Las utilidades aceptan `DEV_SEED_EMAIL` y `DEV_SEED_PASSWORD` como alternativa para el inicio de sesión. La suite por roles también permite `DEV_TEST_PASSWORD` para las cuentas de prueba ya creadas. No guardan credenciales en el repositorio, no imprimen sus valores y no usan una cuenta predeterminada. Mantenga los valores en Windows Credential Manager o en un `.env` local ignorado y protegido; expórtelos al proceso antes de ejecutar los scripts.

Las utilidades HTTP apuntan a `http://localhost:8000`. `seed_remote.py` ya no apunta a un servidor externo por defecto; defina `API_URL` de manera explícita si el entorno de QA autoriza una prueba remota.
