"""Attachment records: registration, association to a message, and access rules.

Blocking database and filesystem work lives here; the router runs it in the
threadpool. Files are content-addressed and shared between records, so deletion
only removes bytes from disk once no other record points at the same digest.
"""

from typing import BinaryIO, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models import Mensaje, MensajeAdjunto, User
from app.services import attachment_policy as policy
from app.services import attachment_storage as storage

CABECERA_BYTES = 4096
MAX_ADJUNTOS_POR_MENSAJE = 10


def serializar_adjunto(adjunto: MensajeAdjunto) -> dict:
    return {
        "id": str(adjunto.id),
        "nombre_archivo": adjunto.nombre_archivo,
        "content_type": adjunto.content_type,
        "categoria": adjunto.categoria,
        "tamano_bytes": int(adjunto.tamano_bytes or 0),
        "previsualizable": policy.es_previsualizable(adjunto.categoria),
    }


def registrar_adjunto(
    db: Session, owner: User, flujo: BinaryIO, nombre_original: str
) -> dict:
    """Clasifica, almacena y registra un archivo subido por el usuario.

    El tipo se decide por la firma binaria: la extensión y el content-type que
    envía el navegador solo tienen que coincidir con lo ya demostrado.
    """
    cabecera = flujo.read(CABECERA_BYTES)
    tipo = policy.clasificar(cabecera, nombre_original)
    limite = policy.limite_bytes(tipo.categoria)

    flujo.seek(0)
    try:
        guardado = storage.guardar_archivo(flujo, tipo.nombre_seguro, limite_bytes=limite)
    except ValueError as err:
        if str(err) == "LIMITE_SUPERADO":
            raise policy.ArchivoDemasiadoGrande(
                f"El archivo supera el límite de {limite // policy.MB} MB para {tipo.categoria}"
            )
        raise

    adjunto = MensajeAdjunto(
        owner_id=owner.id,
        nombre_archivo=tipo.nombre_seguro,
        content_type=tipo.content_type,
        categoria=tipo.categoria,
        tamano_bytes=guardado.tamano_bytes,
        sha256=guardado.sha256,
        storage_path=guardado.ruta_relativa,
    )
    db.add(adjunto)
    db.commit()
    db.refresh(adjunto)
    return serializar_adjunto(adjunto)


def asociar_a_mensaje(
    db: Session, mensaje: Mensaje, owner_id: str, adjunto_ids: List[str]
) -> None:
    """Vincula adjuntos ya subidos al mensaje que se está creando.

    Solo se aceptan adjuntos propios y todavía sin mensaje: así un usuario no
    puede colgar de su mensaje un archivo ajeno ni reutilizar uno ya enviado.
    """
    if not adjunto_ids:
        return

    if len(adjunto_ids) > MAX_ADJUNTOS_POR_MENSAJE:
        raise ValueError(f"Máximo {MAX_ADJUNTOS_POR_MENSAJE} adjuntos por mensaje")

    ids = [str(a) for a in adjunto_ids]
    adjuntos = db.query(MensajeAdjunto).filter(MensajeAdjunto.id.in_(ids)).all()

    if len(adjuntos) != len(set(ids)):
        raise LookupError("Alguno de los adjuntos no existe")

    for adjunto in adjuntos:
        if str(adjunto.owner_id) != str(owner_id):
            raise PermissionError("No puedes adjuntar un archivo que no subiste")
        if adjunto.mensaje_id is not None:
            raise PermissionError("El adjunto ya pertenece a otro mensaje")
        adjunto.mensaje_id = mensaje.id


def obtener_para_descarga(
    db: Session, adjunto_id: str, solicitante: User
) -> Tuple[MensajeAdjunto, str]:
    """Devuelve el adjunto y su ruta absoluta si el solicitante puede verlo.

    Acceden el dueño del archivo y el destinatario del mensaje que lo transporta;
    un adjunto todavía sin enviar solo lo ve quien lo subió.
    """
    adjunto = db.query(MensajeAdjunto).filter(MensajeAdjunto.id == str(adjunto_id)).first()
    if not adjunto:
        raise LookupError("Adjunto no encontrado")

    if not _puede_ver(db, adjunto, solicitante):
        raise PermissionError("No tienes acceso a este archivo")

    ruta = storage.resolver_ruta(adjunto.storage_path)
    if not ruta.exists():
        raise LookupError("El archivo ya no está disponible")

    return adjunto, str(ruta)


def _puede_ver(db: Session, adjunto: MensajeAdjunto, solicitante: User) -> bool:
    uid = str(solicitante.id)

    if str(adjunto.owner_id) == uid or solicitante.rol == "admin":
        return True

    if adjunto.mensaje_id is None:
        return False

    mensaje = db.query(Mensaje).filter(Mensaje.id == adjunto.mensaje_id).first()
    if not mensaje:
        return False

    if mensaje.es_anuncio and mensaje.destinatario_id is None:
        return True

    return uid in (str(mensaje.remitente_id), str(mensaje.destinatario_id))


def eliminar_adjunto_suelto(db: Session, adjunto_id: str, owner_id: str) -> None:
    """Descarta un adjunto subido que aún no se envió (el usuario lo quitó)."""
    adjunto = db.query(MensajeAdjunto).filter(MensajeAdjunto.id == str(adjunto_id)).first()
    if not adjunto:
        raise LookupError("Adjunto no encontrado")
    if str(adjunto.owner_id) != str(owner_id):
        raise PermissionError("No puedes eliminar un adjunto ajeno")
    if adjunto.mensaje_id is not None:
        raise PermissionError("El adjunto ya fue enviado en un mensaje")

    liberar_archivos(db, [adjunto])
    db.delete(adjunto)
    db.commit()


def liberar_archivos(db: Session, adjuntos: List[MensajeAdjunto]) -> None:
    """Borra del disco los archivos que dejan de estar referenciados.

    Se consulta por digest, no por adjunto: el mismo archivo puede sostener
    varios registros gracias a la deduplicación.
    """
    for adjunto in adjuntos:
        referencias = db.query(MensajeAdjunto).filter(
            MensajeAdjunto.sha256 == adjunto.sha256,
            MensajeAdjunto.id != adjunto.id
        ).count()
        storage.eliminar_si_no_referenciado(
            adjunto.storage_path, sigue_referenciado=referencias > 0
        )


def contar_huerfanos(db: Session, antiguedad_horas: int = 24) -> int:
    """Adjuntos subidos que nunca llegaron a enviarse."""
    from datetime import datetime, timedelta, timezone

    corte = datetime.now(timezone.utc) - timedelta(hours=antiguedad_horas)
    return db.query(MensajeAdjunto).filter(
        MensajeAdjunto.mensaje_id.is_(None),
        MensajeAdjunto.created_at < corte
    ).count()


def purgar_huerfanos(db: Session, antiguedad_horas: int = 24) -> int:
    """Limpia los adjuntos que quedaron sin mensaje (subidas abandonadas)."""
    from datetime import datetime, timedelta, timezone

    corte = datetime.now(timezone.utc) - timedelta(hours=antiguedad_horas)
    huerfanos = db.query(MensajeAdjunto).filter(
        MensajeAdjunto.mensaje_id.is_(None),
        MensajeAdjunto.created_at < corte
    ).all()

    liberar_archivos(db, huerfanos)
    for adjunto in huerfanos:
        db.delete(adjunto)
    db.commit()
    return len(huerfanos)
