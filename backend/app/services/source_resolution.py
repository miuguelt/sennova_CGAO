"""Conservación de discrepancias y registro explícito de su aclaración con soporte."""

from datetime import date

from fastapi import HTTPException

RESOLUTION_KEYS = ("inconsistencia", "valor_confirmado", "soporte", "responsable", "fecha")


def source_is_resolved(common):
    """Comprueba el registro de una aclaración; no certifica la autenticidad del soporte."""
    original = str(common.get("inconsistencias_fuente") or "").strip()
    if not original:
        return True
    rows = common.get("aclaraciones_fuente") or []
    if not isinstance(rows, list):
        return False
    for row in rows:
        if not isinstance(row, dict):
            continue
        if not all(isinstance(row.get(key), str) and row[key].strip() for key in RESOLUTION_KEYS):
            continue
        if row["inconsistencia"].strip() != original:
            continue
        try:
            date.fromisoformat(row["fecha"])
        except ValueError:
            continue
        return True
    return False


def validate_source_preservation(previous, current, members):
    """Evita sustituir el pendiente por un vacío y atribuir la aclaración a alguien ajeno."""
    original = str(previous.get("inconsistencias_fuente") or "").strip()
    updated = str(current.get("inconsistencias_fuente") or "").strip()
    if original and not updated.startswith(original):
        raise HTTPException(status_code=422, detail="Conserva el texto original de las inconsistencias de la fuente. Registra el dato confirmado y su soporte en Aclaraciones de la fuente; puedes añadir nuevos pendientes al final del texto.")
    allowed = {" ".join(name.split()).casefold() for name in members}
    for index, row in enumerate(current.get("aclaraciones_fuente") or []):
        responsible = " ".join(str(row.get("responsable") or "").split()).casefold()
        if responsible and responsible not in allowed:
            raise HTTPException(status_code=422, detail=f"Aclaraciones de la fuente, fila {index + 1}: selecciona un responsable vinculado al equipo del proyecto o regístralo en Personal vinculado con su designación confirmada.")
