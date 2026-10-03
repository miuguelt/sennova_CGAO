"""Lectura acotada de formulaciones CAP en formato DOCX."""

from __future__ import annotations

import io
import re
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from pathlib import PurePosixPath


MAX_FORMULATION_FILE_SIZE = 10 * 1024 * 1024
MAX_DOCX_EXPANDED_SIZE = 30 * 1024 * 1024
WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
SECTION_NAMES = {
    2: "Introducción",
    3: "Planteamiento del problema",
    4: "Justificación",
    6: "Referente teórico",
    7: "Metodología",
    8: "Resultados esperados",
    9: "Cronograma",
    10: "Referencias",
}


class FormulationFileError(ValueError):
    """Indica que el archivo no se puede interpretar como formulación DOCX."""


def safe_document_filename(filename: str | None) -> str:
    """Reduce el nombre cargado a un nombre visible sin ruta ni controles."""
    normalized = (filename or "").replace("\\", "/")
    safe_name = PurePosixPath(normalized).name
    safe_name = "".join(char for char in safe_name if char.isprintable() and char not in '\r\n"')
    return safe_name.strip() or "formulacion.docx"


def _paragraph_text(paragraph: ET.Element) -> str:
    """Lee texto, saltos y tabulaciones de un párrafo Word."""
    parts = []
    for element in paragraph.iter():
        if element.tag == f"{WORD_NS}t" and element.text:
            parts.append(element.text)
        elif element.tag in (f"{WORD_NS}tab", f"{WORD_NS}br", f"{WORD_NS}cr"):
            parts.append(" ")
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def _read_docx_rows(content: bytes) -> list[list[str]]:
    """Extrae filas y párrafos sin descomprimir el archivo en el disco."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            entries = archive.infolist()
            if len(entries) > 2048 or sum(item.file_size for item in entries) > MAX_DOCX_EXPANDED_SIZE:
                raise FormulationFileError("El DOCX supera el tamaño interno permitido.")
            document_entry = archive.getinfo("word/document.xml")
            if document_entry.file_size > MAX_DOCX_EXPANDED_SIZE:
                raise FormulationFileError("El contenido del DOCX supera el tamaño permitido.")
            document_xml = archive.read(document_entry)
    except FormulationFileError:
        raise
    except (zipfile.BadZipFile, KeyError, OSError, RuntimeError) as error:
        raise FormulationFileError("El archivo no es un DOCX válido o está dañado.") from error

    safety_scan = document_xml.replace(b"\x00", b"").upper()
    if b"<!DOCTYPE" in safety_scan or b"<!ENTITY" in safety_scan:
        raise FormulationFileError("El DOCX contiene una estructura XML no permitida.")
    try:
        document = ET.fromstring(document_xml)
    except ET.ParseError as error:
        raise FormulationFileError("El contenido XML del DOCX está dañado.") from error

    rows = []
    body = document.find(f"{WORD_NS}body")
    if body is None:
        raise FormulationFileError("El DOCX no contiene un cuerpo de documento legible.")
    rows.extend([[text] for paragraph in body.findall(f"{WORD_NS}p") if (text := _paragraph_text(paragraph))])
    for table in body.iter(f"{WORD_NS}tbl"):
        for table_row in table.findall(f"{WORD_NS}tr"):
            cells = []
            for cell in table_row.findall(f"{WORD_NS}tc"):
                paragraphs = [
                    text for paragraph in cell.findall(f"{WORD_NS}p")
                    if (text := _paragraph_text(paragraph))
                ]
                cell_text = "\n".join(paragraphs)
                if cell_text and cell_text not in cells:
                    cells.append(cell_text)
            if cells:
                rows.append(cells)
    return rows


def _normalize_label(value: str) -> str:
    """Normaliza acentos y puntuación para comparar rótulos institucionales."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    without_accents = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", without_accents).strip()


def _paragraphs(rows: list[list[str]]) -> list[str]:
    """Aplana las celdas conservando el orden y quitando duplicados de celdas combinadas."""
    result = []
    seen = set()
    for row in rows:
        for cell in row:
            for paragraph in cell.splitlines():
                text = paragraph.strip()
                if text and text not in seen:
                    seen.add(text)
                    result.append(text)
    return result


def _find_labeled_value(rows: list[list[str]], label: str) -> str | None:
    """Busca el valor de una fila general CAP por el rótulo de su primera celda."""
    target = _normalize_label(label)
    for row in rows:
        if not row or _normalize_label(row[0].splitlines()[0]) != target:
            continue
        for cell in row[1:]:
            candidate = cell.strip()
            if candidate and _normalize_label(candidate) != target:
                return candidate
    return None


def _section_content(rows: list[list[str]], section_number: int) -> str:
    """Obtiene el texto de una sección numerada hasta el siguiente encabezado."""
    lines = _paragraphs(rows)
    heading = re.compile(r"^\s*(\d{1,2})\s*[.)-]\s*[^:]{2,80}\s*:?\s*(.*)$", re.IGNORECASE)
    start = None
    collected = []
    for line in lines:
        match = heading.match(line)
        if match:
            number = int(match.group(1))
            if number == section_number:
                start = True
                if match.group(2).strip():
                    collected.append(match.group(2).strip())
                continue
            if start:
                break
        elif start:
            collected.append(line.strip())
    return "\n".join(line for line in collected if line).strip()


def _extract_objectives(rows: list[list[str]]) -> tuple[str | None, list[str]]:
    """Separa objetivo general y específicos usando los párrafos del apartado 5."""
    objective_row = next(
        (row for row in rows if row and re.search(r"\b5\s*[.)-]?\s*objetivos\b", _normalize_label(" ".join(row)))),
        [],
    )
    general = None
    specifics = []
    mode = None
    for paragraph in _paragraphs([objective_row]):
        normalized = _normalize_label(paragraph)
        if re.search(r"objetivo\s+general", normalized):
            mode = "general"
            remainder = re.split(r"objetivo\s+general\s*:?", paragraph, maxsplit=1, flags=re.IGNORECASE)[-1].strip(" :.-")
            if remainder:
                general = remainder
            continue
        if re.search(r"objetivos?\s+especificos?", normalized):
            mode = "specific"
            remainder = re.split(r"objetivos?\s+especificos?\s*:?", paragraph, maxsplit=1, flags=re.IGNORECASE)[-1].strip(" :.-")
            remainder_normalized = _normalize_label(remainder)
            if len(remainder) >= 30 and re.match(r"^[a-z]+(?:ar|er|ir)\b", remainder_normalized):
                specifics.append(remainder)
            continue
        if mode == "general" and not general:
            general = paragraph.strip()
        elif mode == "specific" and len(paragraph.strip()) >= 30 and re.match(r"^[a-z]+(?:ar|er|ir)\b", normalized):
            specifics.append(paragraph.strip())
    return general, specifics


def extract_formulation_draft(filename: str | None, content: bytes) -> dict:
    """Valida un DOCX y devuelve solo sugerencias revisables para el formulario."""
    if not (filename or "").lower().endswith(".docx"):
        raise FormulationFileError("Selecciona un archivo de Word con extensión .docx.")
    if not content:
        raise FormulationFileError("El archivo está vacío.")
    if len(content) > MAX_FORMULATION_FILE_SIZE:
        raise FormulationFileError("El archivo supera el límite de 10 MB.")

    rows = _read_docx_rows(content)
    title = _find_labeled_value(rows, "Título del Proyecto") or _section_content(rows, 1)
    general_objective, specific_objectives = _extract_objectives(rows)
    description_sections = []
    for section_number, section_name in SECTION_NAMES.items():
        content_text = _section_content(rows, section_number)
        if content_text:
            description_sections.append(f"{section_name}:\n{content_text}")

    suggested_fields = {}
    sources = {}
    if title:
        suggested_fields["nombre"] = title
        sources["nombre"] = "Título del Proyecto"
    if general_objective:
        suggested_fields["objetivo_general"] = general_objective
        sources["objetivo_general"] = "Objetivo general"
    if specific_objectives:
        suggested_fields["objetivos_especificos"] = specific_objectives
        sources["objetivos_especificos"] = "Objetivos específicos"
    if description_sections:
        suggested_fields["descripcion"] = "\n\n".join(description_sections)
        sources["descripcion"] = "Secciones de la formulación"

    detected_references = {
        "grupo": _find_labeled_value(rows, "Grupo de Investigación"),
        "semillero": _find_labeled_value(rows, "Nombre del Semillero"),
    }
    missing_fields = [
        field for field in ("nombre", "objetivo_general", "objetivos_especificos", "descripcion")
        if field not in suggested_fields
    ]
    return {
        "suggested_fields": suggested_fields,
        "field_sources": sources,
        "referencias_detectadas": detected_references,
        "campos_no_detectados": missing_fields,
        "mensaje": "Revisa y ajusta los datos extraídos antes de crear el proyecto.",
    }


# Secciones numeradas de la formulación CAP y su campo en el formulario guiado.
GUIDED_SECTION_FIELDS = {
    2: "introduccion",
    3: "planteamiento_problema",
    4: "justificacion",
    6: "referente_teorico",
    7: "metodologia",
    9: "fases",
    10: "referencias",
}
GUIDED_TEXT_LIMIT = 20000
GUIDED_ROW_LIMIT = 80


def extract_formulation_sections(filename: str | None, content: bytes) -> dict:
    """Propone valores para el formulario guiado a partir de un formato diligenciado.

    No guarda datos: la persona revisa la propuesta antes de aplicarla. Los textos
    se recortan al límite del formulario y se informa cuando eso ocurre.
    """
    base = extract_formulation_draft(filename, content)
    rows = _read_docx_rows(content)
    draft = {}
    truncated = []
    for number, key in GUIDED_SECTION_FIELDS.items():
        text = _section_content(rows, number)
        if not text:
            continue
        if len(text) > GUIDED_TEXT_LIMIT:
            text = text[:GUIDED_TEXT_LIMIT]
            truncated.append(key)
        draft[key] = text
    results = [line.strip(" -•\t") for line in _section_content(rows, 8).splitlines() if line.strip(" -•\t")]
    if results:
        draft["resultados_esperados"] = [
            {"resultado": line[:2000], "indicador": "", "meta": "", "unidad": "", "medio_verificacion": ""}
            for line in results[:GUIDED_ROW_LIMIT]
        ]
    suggested = base["suggested_fields"]
    project = {key: suggested[key] for key in ("nombre", "objetivo_general") if key in suggested}
    if suggested.get("objetivos_especificos"):
        project["objetivos_especificos"] = "\n".join(suggested["objetivos_especificos"])
    expected = list(GUIDED_SECTION_FIELDS.values()) + ["resultados_esperados"]
    return {
        "borrador": draft,
        "proyecto": project,
        "campos_detectados": sorted(draft) + sorted(project),
        "campos_no_detectados": [key for key in expected if key not in draft]
                                + [key for key in ("nombre", "objetivo_general", "objetivos_especificos") if key not in project],
        "campos_recortados": truncated,
        "mensaje": "Revise la propuesta. Solo se aplicará a los campos que usted confirme.",
    }
