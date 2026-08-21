"""Bootstrap del administrador inicial.

Responsabilidad única: dejar la base de datos con exactamente un administrador
utilizable la primera vez que se despliega la aplicación, sin publicar nunca
credenciales por defecto y sin tocar los datos de un despliegue ya vivo.

Es la única fuente de verdad del arranque: la usan tanto el ciclo de vida de
FastAPI (``app.main``) como el script de contenedor
``scripts/bootstrap_initial_data.py`` que ejecuta el entrypoint de Docker.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.auth import get_password_hash
from app.models import User

MIN_ADMIN_PASSWORD_LENGTH = 12


class AdminBootstrapError(RuntimeError):
    """El administrador inicial no se puede crear con la configuración dada."""


@dataclass(frozen=True)
class InitialAdminCredentials:
    """Datos del primer administrador, tomados del entorno del despliegue."""

    email: str
    password: str
    nombre: str = "Administrador SENNOVA"
    documento: str = ""
    sede: str = ""


@dataclass(frozen=True)
class AdminBootstrapResult:
    """Resultado del arranque, para que quien llame informe sin adivinar."""

    created: bool
    email: str
    detail: str


def ensure_initial_admin(
    db: Session,
    credentials: InitialAdminCredentials,
    *,
    enforce_strong_password: bool = True,
) -> AdminBootstrapResult:
    """Crea el administrador inicial si la instalación todavía no tiene ninguno.

    Es idempotente: con un administrador ya presente no crea otro ni reescribe
    su contraseña, porque un redespliegue no puede revertir las credenciales que
    el operador cambió desde la aplicación.

    Lanza :class:`AdminBootstrapError` cuando la configuración no permite crear
    un administrador seguro, en vez de crear uno abierto.
    """
    _validate(credentials, enforce_strong_password=enforce_strong_password)

    existing = _find_existing_admin(db, credentials.email)
    if existing is not None:
        return AdminBootstrapResult(
            created=False,
            email=existing.email,
            detail=(
                f"Ya existe un administrador ({existing.email}); "
                "no se modifica ninguna credencial."
            ),
        )

    _assert_documento_disponible(db, credentials.documento)

    admin = User(
        email=credentials.email,
        password_hash=get_password_hash(credentials.password),
        nombre=credentials.nombre,
        rol="admin",
        sede=credentials.sede or None,
        documento=credentials.documento or None,
        is_active=True,
    )
    db.add(admin)
    try:
        db.commit()
    except Exception as exc:  # pragma: no cover - depende del motor de BD
        db.rollback()
        raise AdminBootstrapError(
            f"No se pudo crear el administrador inicial: {exc}"
        ) from exc
    db.refresh(admin)

    return AdminBootstrapResult(
        created=True,
        email=admin.email,
        detail=f"Administrador inicial creado: {admin.email}",
    )


def credentials_from_settings(settings) -> InitialAdminCredentials:
    """Adapta la configuración de la aplicación al contrato de este módulo."""
    return InitialAdminCredentials(
        email=settings.INITIAL_ADMIN_EMAIL,
        password=settings.INITIAL_ADMIN_PASSWORD,
        nombre=settings.INITIAL_ADMIN_NOMBRE,
        documento=settings.INITIAL_ADMIN_DOCUMENTO,
        sede=settings.INITIAL_ADMIN_SEDE,
    )


def _validate(
    credentials: InitialAdminCredentials, *, enforce_strong_password: bool
) -> None:
    if not credentials.email.strip():
        raise AdminBootstrapError(
            "INITIAL_ADMIN_EMAIL está vacía. Define el correo del administrador "
            "inicial en el entorno del despliegue."
        )

    if not credentials.password:
        raise AdminBootstrapError(
            "INITIAL_ADMIN_PASSWORD no está definida. Sin ella el administrador "
            "quedaría publicado con una contraseña vacía. Genera una con "
            "'python -c \"import secrets; print(secrets.token_urlsafe(24))\"' y "
            "defínela en el entorno del despliegue."
        )

    if enforce_strong_password and len(credentials.password) < MIN_ADMIN_PASSWORD_LENGTH:
        raise AdminBootstrapError(
            f"INITIAL_ADMIN_PASSWORD debe tener mínimo {MIN_ADMIN_PASSWORD_LENGTH} "
            "caracteres en producción. Define una contraseña más larga en el "
            "entorno del despliegue."
        )


def _find_existing_admin(db: Session, email: str) -> User | None:
    """Devuelve el administrador vigente, por correo objetivo o por rol."""
    by_email = db.query(User).filter(User.email == email).first()
    if by_email is not None:
        return by_email
    return db.query(User).filter(User.rol == "admin").first()


def _assert_documento_disponible(db: Session, documento: str) -> None:
    if not documento:
        return
    ocupado = db.query(User).filter(User.documento == documento).first()
    if ocupado is not None:
        raise AdminBootstrapError(
            f"INITIAL_ADMIN_DOCUMENTO '{documento}' ya pertenece al usuario "
            f"{ocupado.email}. Usa un documento distinto para el administrador "
            "inicial."
        )
