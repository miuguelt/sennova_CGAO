"""Validación de campos guiados sin completar hechos ausentes."""

import json
from datetime import date
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException


def invalid_field(path, message):
    raise HTTPException(status_code=422, detail=f"{path}: {message}")


def normalize_value(value, field, path):
    kind = field["type"]
    if value is None or value == "":
        return "" if kind != "rows" else []
    if kind == "rows":
        if not isinstance(value, list) or len(value) > 80:
            invalid_field(path, "ingresa una lista de hasta 80 filas.")
        return [validate_fields(row, field["columns"], path=f"{path}, fila {index + 1}") for index, row in enumerate(value)]
    if kind == "number":
        try:
            if isinstance(value, bool):
                raise InvalidOperation
            numeric = Decimal(str(value))
            if not numeric.is_finite() or numeric < Decimal(str(field.get("min", 0))):
                raise InvalidOperation
            if field.get("max") is not None and numeric > Decimal(str(field["max"])):
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            invalid_field(path, "ingresa un número válido dentro del rango permitido.")
        return format(numeric, "f")
    if not isinstance(value, str) or len(value) > (20000 if kind == "textarea" else 2000):
        invalid_field(path, "ingresa un texto dentro de la longitud permitida.")
    value = value.strip()
    if kind == "date" and value:
        try:
            if date.fromisoformat(value).isoformat() != value:
                raise ValueError
        except ValueError:
            invalid_field(path, "ingresa una fecha válida con el formato AAAA-MM-DD.")
    if kind == "select" and value not in {option["value"] for option in field["options"]}:
        invalid_field(path, "selecciona una de las opciones disponibles.")
    return value


def validate_fields(data, fields, *, path="Formulario"):
    if not isinstance(data, dict):
        invalid_field(path, "ingresa un objeto con los campos del formulario.")
    definitions = {field["key"]: field for field in fields}
    unknown = set(data) - set(definitions)
    if unknown:
        invalid_field(path, "hay campos no reconocidos: " + ", ".join(sorted(unknown)))
    if len(json.dumps(data, ensure_ascii=False).encode("utf-8")) > 400000:
        invalid_field(path, "el formulario supera el tamaño permitido.")
    normalized = {key: normalize_value(value, definitions[key], definitions[key]["label"]) for key, value in data.items()}
    for start, end in (("fecha_inicio", "fecha_fin"), ("periodo_desde", "periodo_hasta")):
        if normalized.get(start) and normalized.get(end) and normalized[start] > normalized[end]:
            invalid_field(path, "la fecha final debe ser igual o posterior a la fecha inicial.")
    return normalized


def missing_fields(data, fields, *, prefix=""):
    pending = []
    for field in fields:
        key = field["key"]
        value = data.get(key)
        if field.get("required") and (value is None or value == "" or value == []):
            pending.append({"campo": prefix + key, "mensaje": f"Completa {field['label'].lower()}."})
        if field["type"] == "rows" and isinstance(value, list):
            for index, row in enumerate(value):
                pending.extend(missing_fields(row, field["columns"], prefix=f"{prefix}{key}.{index}."))
    return pending
