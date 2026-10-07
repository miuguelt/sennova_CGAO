"""Diligencia el formato institucional GCDTP-F-023 V01 del informe final."""

import io
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image

from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_rendering_values import PENDING, field_text, format_value

TEMPLATE_NAME = "GCDTP-F-023_V01_Formato_Informe_Final.docx"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _field_lines(keys, fields, data):
    """Representa los campos del informe con su etiqueta y valor validado."""
    return [f"{fields[key]['label']}: {format_value(data.get(key), fields[key])}" for key in keys]


def _paragraph_after(document, heading):
    """Obtiene el párrafo de contenido inmediato a un encabezado del formato."""
    paragraphs = document.paragraphs
    for index, paragraph in enumerate(paragraphs):
        if paragraph.text.strip().startswith(heading):
            paragraph.paragraph_format.keep_with_next = True
            if index + 1 < len(paragraphs):
                return paragraphs[index + 1]
            break
    raise ValueError(f"La plantilla del informe final no contiene el encabezado: {heading}")


def _replace_paragraph(paragraph, text):
    """Sustituye instrucciones de diligenciamiento por contenido sin perder el estilo."""
    paragraph.clear()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.add_run(str(text or PENDING))


def _result_lines(fields, data):
    """Organiza el análisis que acompaña la tabla de resultados alcanzados."""
    return "\n".join(_field_lines(["discusion", "fortalezas", "dificultades", "cumplimiento_objetivos"], fields, data))


def _insert_results_table(document, anchor, fields, data):
    """Inserta resultados y métricas en una tabla editable dentro de la sección 8."""
    result_field = fields["resultados"]
    records = data.get("resultados") or [{}]
    table = document.add_table(rows=1, cols=4)
    table.style = document.tables[1].style
    table.autofit = True
    headings = ["Entidad o población", "Actividades ejecutadas", "Resultados, indicador y medición", "Evidencia"]
    for cell, heading in zip(table.rows[0].cells, headings):
        cell.text = heading
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.bold = True
                run.font.size = Pt(8)
    header = OxmlElement("w:tblHeader")
    table.rows[0]._tr.get_or_add_trPr().append(header)
    for row_index, record in enumerate(records):
        values = {column["key"]: format_value(record.get(column["key"]), column)
                  for column in result_field["columns"]}
        outcome = "\n".join([
            f"Resultados alcanzados: {values['resultados_alcanzados']}",
            f"Indicador: {values['indicador']}",
            f"Meta: {values['meta']}",
            f"Logro: {values['logro']}",
            f"Unidad: {values['unidad']}",
        ])
        cells = table.add_row().cells
        for cell, value in zip(cells, [values["entidad"], values["actividades_ejecutadas"], outcome, values["evidencia"]]):
            cell.text = value
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.space_after = Pt(2)
                for run in paragraph.runs:
                    run.font.size = Pt(7)
        table.rows[row_index + 1]._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
    anchor._p.addprevious(table._tbl)


def _development_lines(fields, data):
    """Une antecedentes y ejecución bajo la sección de desarrollo del proyecto."""
    return "\n".join(_field_lines(["antecedentes", "desarrollo_proyecto"], fields, data))


def _viability_lines(fields, data):
    """Presenta de forma separada los cinco componentes de viabilidad."""
    return "\n".join(_field_lines([
        "viabilidad_tecnica", "viabilidad_operativa", "viabilidad_economica",
        "viabilidad_normativa", "viabilidad_mercado",
    ], fields, data))


def _conclusion_lines(fields, data):
    """Conserva conclusiones, balance, acciones futuras y aprendizajes."""
    return "\n".join(_field_lines([
        "conclusiones", "balance_final", "acciones_futuras", "lecciones_aprendidas",
    ], fields, data))


def _project_context_rows(context, common):
    """Devuelve contexto adicional que el formato no solicita en su tabla de ficha."""
    date_field = {"label": "Fecha", "type": "date"}
    number_field = {"label": "Duración registrada (meses)", "type": "number"}
    money_field = {"label": "Presupuesto total registrado", "type": "number", "unit": "COP"}
    return [
        ("Centro de formación", common.get("centro")),
        ("Regional", common.get("regional")),
        ("Ciudad", common.get("ciudad")),
        ("Responsable del proyecto", common.get("responsable")),
        ("Fecha de inicio del proyecto", format_value(common.get("fecha_inicio"), date_field)),
        ("Fecha de terminación del proyecto", format_value(common.get("fecha_fin"), date_field)),
        ("Duración registrada (meses)", format_value(context.get("vigencia"), number_field)),
        ("Presupuesto total registrado", format_value(context.get("presupuesto_total"), money_field)),
        ("Código CAP", common.get("codigo_cap")),
        ("Código SGPS", context.get("codigo_sgps")),
        ("Grupo de investigación", context.get("grupo")),
        ("Semillero", context.get("semillero")),
    ]


def _fill_general_table(document, context, common, data, fields):
    """Diligencia la ficha institucional y amplía el contexto del proyecto."""
    table = document.tables[1]
    values = {
        "Talento que realiza el informe": format_value(data.get("autor_informe"), fields["autor_informe"]),
        "Nombre del Proyecto de Base Tecnológica": context["nombre"],
        "Código de la Idea": format_value(data.get("codigo_idea"), fields["codigo_idea"]),
        "Experto del proyecto": format_value(data.get("experto_proyecto"), fields["experto_proyecto"]),
        "Línea tecnológica": format_value(data.get("linea_tecnologica"), fields["linea_tecnologica"]),
        "TRL inicial": format_value(data.get("trl_inicial"), fields["trl_inicial"]),
        "TRL alcanzado": format_value(data.get("trl_alcanzado"), fields["trl_alcanzado"]),
        "TecnoParque en el que fue desarrollado el Proyecto de Base Tecnológica": format_value(data.get("tecnoparque"), fields["tecnoparque"]),
        "Fecha de entrega": format_value(data.get("fecha_entrega"), fields["fecha_entrega"]),
    }
    for row in table.rows:
        label = row.cells[0].text.strip()
        if label not in values:
            raise ValueError(f"La plantilla del informe final no contiene el campo general: {label}")
        row.cells[1].text = values[label]
        # Algunas etiquetas largas están repartidas entre celdas contiguas en
        # la tabla fuente. Escribe de nuevo la etiqueta completa para que al
        # sustituir la celda del valor no se pierdan fragmentos del rótulo.
        row.cells[0].text = label
    for label, raw_value in _project_context_rows(context, common):
        row = table.add_row()
        row.cells[0].text = label
        row.cells[1].text = str(raw_value).strip() if raw_value not in (None, "") else PENDING


def _fill_classification(document, data, fields):
    """Marca la clasificación explícitamente seleccionada para este informe."""
    selected = format_value(data.get("clasificacion_informacion"), fields["clasificacion_informacion"])
    for cell in document.tables[0].rows[5].cells:
        label = cell.text.strip()
        cell.text = f"{label} (X)" if label == selected else label


def _add_draft_status(document, context):
    """Añade el estado de borrador y su versión sin alterar el formato base."""
    status = f"Borrador para revisión · Versión {context.get('version', 1)}"
    document.sections[0].header.paragraphs[0].text = status
    heading = next((paragraph for paragraph in document.paragraphs
                    if paragraph.text.strip() == "Información general del proyecto"), None)
    if heading is None:
        raise ValueError("La plantilla del informe final no contiene la ficha del proyecto")


def _remove_instructions(document):
    """Elimina instrucciones y control de cambios como ordena el formato fuente."""
    body = document._element.body
    start = next((index for index, element in enumerate(body)
                  if element.tag.endswith("}p") and "INSTRUCCIONES" in "".join(element.itertext())), None)
    if start is None:
        raise ValueError("La plantilla del informe final no contiene el bloque de instrucciones esperado")
    for element in list(body)[start:]:
        if element.tag.endswith("}sectPr"):
            continue
        body.remove(element)


def _simplify_table_of_contents(document):
    """Conserva enlaces del índice sin paginación almacenada de la plantilla."""
    indexes = document.element.body.xpath(
        ".//w:sdt[w:sdtPr/w:docPartObj/w:docPartGallery[@w:val='Table of Contents']]",
    )
    removed_tags = {qn("w:fldChar"), qn("w:instrText"), qn("w:webHidden")}
    for index in indexes:
        for run in list(index.iter(qn("w:r"))):
            if any(element.tag in removed_tags for element in run.iter()):
                run.getparent().remove(run)


def _keep_table_rows_together(document):
    """Evita repartir una etiqueta o registro de tabla entre dos páginas."""
    for table in document.tables:
        for row in table.rows:
            if not row._tr.xpath("./w:trPr/w:cantSplit"):
                row._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))


def _supplementary_heading(document, text, level):
    """Añade encabezados negros sin modificar los estilos del formato fuente."""
    heading = document.add_heading(text, level=level)
    heading.paragraph_format.keep_with_next = True
    for run in heading.runs:
        run.font.color.rgb = RGBColor(0, 0, 0)


def _append_photos(document, photos):
    """Incluye imágenes reales recibidas como anexos fotográficos del informe."""
    if not photos:
        return
    _supplementary_heading(document, "Registro fotográfico", level=1)
    for content, caption in photos:
        with Image.open(io.BytesIO(content)) as image:
            width = min(Cm(15), int(Cm(16) * image.width / image.height))
        document.add_picture(io.BytesIO(content), width=width)
        document.paragraphs[-1].paragraph_format.keep_with_next = True
        document.add_paragraph(caption, style="Caption")


def _append_common_details(document, common):
    """Conserva contexto formativo, planeación y advertencias fuera de la ficha base."""
    captured = {"centro", "regional", "ciudad", "responsable", "fecha_inicio", "fecha_fin", "codigo_cap"}
    details = [field for field in COMMON_FIELDS if field["key"] not in captured
               and common.get(field["key"]) not in (None, "", [])]
    if not details:
        return
    _supplementary_heading(document, "Información complementaria del proyecto", level=1)
    for field in details:
        public_field = dict(field)
        if field["type"] == "rows":
            public_field["columns"] = [column for column in field["columns"] if not column.get("optional_detail")]
        _supplementary_heading(document, field["label"], level=2)
        for line in field_text(public_field, common).splitlines():
            if line.strip():
                document.add_paragraph(line)


def render_final_report(context, common, data, photos):
    """Genera el informe final sobre la plantilla GCDTP-F-023 V01 empaquetada."""
    template_path = Path(__file__).resolve().parents[1] / "templates" / TEMPLATE_NAME
    if not template_path.is_file():
        raise RuntimeError("No está instalada la plantilla GCDTP-F-023 V01 del informe final")
    document = Document(template_path)
    fields = {field["key"]: field for field in DOCUMENT_DEFINITIONS["informe_final"]["fields"]}
    _fill_general_table(document, context, common, data, fields)
    _fill_classification(document, data, fields)
    replacements = {
        "Introducción": "introduccion",
        "Planteamiento del problema": "planteamiento_problema",
        "5. Estado del arte y estado de la técnica": "estado_arte_tecnica",
        "6. Metodología de desarrollo": "metodologia",
        "7. Desarrollo del proyecto": _development_lines(fields, data),
        "8. Resultados obtenidos": _result_lines(fields, data),
        "9. Análisis de viabilidad": _viability_lines(fields, data),
        "10. Propiedad intelectual y transferencia tecnológica": "propiedad_intelectual_transferencia",
        "11. Impacto del proyecto": "impacto_proyecto",
        "12. Conclusiones": _conclusion_lines(fields, data),
        "13. Referencias bibliográficas": "referencias",
        "14. Anexos": "anexos",
    }
    for heading, value in replacements.items():
        content = "\n".join(_field_lines([value], fields, data)) if isinstance(value, str) and value in fields else value
        _replace_paragraph(_paragraph_after(document, heading), content)
    _replace_paragraph(
        _paragraph_after(document, "Objetivos"),
        "A continuación se presentan los objetivos registrados para el proyecto.",
    )
    _replace_paragraph(_paragraph_after(document, "4.1 Objetivo General"), context.get("objetivo_general"))
    objectives = context.get("objetivos_especificos") or []
    if isinstance(objectives, str):
        objectives = objectives.splitlines()
    specific_text = "\n".join(f"{index}. {objective}" for index, objective in enumerate(objectives, start=1)) or PENDING
    _replace_paragraph(_paragraph_after(document, "4.2 Objetivos Específicos"), specific_text)
    _add_draft_status(document, context)
    _remove_instructions(document)
    _simplify_table_of_contents(document)
    _insert_results_table(document, _paragraph_after(document, "8. Resultados obtenidos"), fields, data)
    _append_common_details(document, common)
    _append_photos(document, photos)
    _keep_table_rows_together(document)
    document.core_properties.title = "GCDTP-F-023 V01 - Informe final de proyecto"
    document.core_properties.author = "SENNOVA"
    document.core_properties.last_modified_by = "SENNOVA"
    document.core_properties.subject = "Borrador generado a partir de datos del proyecto"
    output = io.BytesIO()
    document.save(output)
    return output.getvalue(), DOCX_MIME
