"""Validación y representación de valores compartidos por los adaptadores Office."""

import io
import textwrap
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from PIL import Image, UnidentifiedImageError

PENDING = "Pendiente por diligenciar"


def format_value(value, field):
    """Formatea fechas y cifras sin inventar datos faltantes ni corregir la fuente."""
    if value is None or value == "":
        return PENDING
    kind = field["type"]
    if kind == "date":
        try:
            parsed = value.date() if isinstance(value, datetime) else value if isinstance(value, date) else date.fromisoformat(value)
        except (TypeError, ValueError):
            raise ValueError(f"{field['label']}: indica una fecha válida en formato AAAA-MM-DD")
        return parsed.strftime("%d/%m/%Y")
    if kind == "number":
        try:
            number = Decimal(str(value))
            if isinstance(value, bool) or not number.is_finite():
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            raise ValueError(f"{field['label']}: indica un número válido")
        if field.get("unit") == "COP":
            amount = f"{number:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
            return f"COP $ {amount}"
        return format(number, "f")
    if kind == "select":
        for option in field["options"]:
            if option["value"] == value:
                return option["label"]
        raise ValueError(f"{field['label']}: selecciona una opción válida")
    if not isinstance(value, str):
        raise ValueError(f"{field['label']}: indica un texto válido")
    return value



def validate_fields(fields, values):
    """Comprueba tipos; la exigencia de campos completos corresponde al servicio."""
    if not isinstance(values, dict):
        raise ValueError("Los datos del documento deben ser un objeto")
    for field in fields:
        value = values.get(field["key"])
        if field["type"] == "rows":
            if value is None:
                continue
            if not isinstance(value, list) or any(not isinstance(row, dict) for row in value):
                raise ValueError(f"{field['label']}: registra una lista de filas")
            validate_fields(field["columns"], {})
            for row in value:
                validate_fields(field["columns"], row)
        else:
            format_value(value, field)



def photo_records(images):
    """Valida imágenes reales y conserva metadatos explícitos sin asumir fechas."""
    if images is None:
        return []
    if not isinstance(images, list) or len(images) > 50:
        raise ValueError("Adjunta una lista de hasta 50 fotografías")
    records = []
    for image in images:
        if not isinstance(image, dict) or not isinstance(image.get("content"), bytes):
            raise ValueError("Cada fotografía debe contener bytes de una imagen real")
        content = image["content"]
        if not content or len(content) > 10 * 1024 * 1024:
            raise ValueError("Cada fotografía debe tener contenido y un tamaño máximo de 10 MB")
        try:
            with Image.open(io.BytesIO(content)) as decoded:
                if decoded.format not in {"PNG", "JPEG"}:
                    raise ValueError("Adjunta fotografías PNG o JPEG")
                decoded.verify()
        except (OSError, UnidentifiedImageError, Image.DecompressionBombError):
            raise ValueError("La fotografía no contiene una imagen PNG o JPEG válida")
        caption = str(image.get("caption") or "Fotografía sin descripción registrada")
        if image.get("fecha"):
            caption += "\nFecha real: " + format_value(image["fecha"], {"label": "Fecha de la fotografía", "type": "date"})
        if image.get("autor"):
            caption += "\nAutor: " + str(image["autor"])
        records.append((content, caption))
    return records



def text_chunks(text, width=86, lines=12):
    """Divide contenido por líneas reales y conserva todas las palabras."""
    wrapped = []
    for paragraph in str(text).splitlines():
        wrapped.extend(textwrap.wrap(paragraph, width=width, break_long_words=True, break_on_hyphens=False) or [""])
    return ["\n".join(wrapped[index:index + lines]) for index in range(0, len(wrapped), lines)] or [PENDING]



def field_text(field, values):
    """Convierte campos guiados en texto editable para presentaciones y pósteres."""
    if field["type"] != "rows":
        return format_value(values.get(field["key"]), field)
    rows = values.get(field["key"]) or []
    return "\n\n".join("\n".join(f"{column['label']}: {format_value(row.get(column['key']), column)}" for column in field["columns"]) for row in rows) or PENDING

