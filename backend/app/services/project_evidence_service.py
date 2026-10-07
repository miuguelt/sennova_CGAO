"""Expediente documental basado en los seis directorios aportados por el usuario."""

import base64
import binascii
import json
import math
import re
from pathlib import Path
from tempfile import SpooledTemporaryFile
from zipfile import ZipFile, ZIP_DEFLATED

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Documento, Proyecto

# Los nombres de directorio conservan literalmente el contrato de la referencia.
STAGES = (
    ("formulacion", "1ProyectoFomulado", "Proyecto formulado", "formulacion_proyecto", {"formulacion_proyecto", "presentacion_proyecto"}, "Adjunte la formulación, la metodología, los objetivos, el presupuesto y el cronograma. Puede agregar la presentación del proyecto."),
    ("inicio", "2ActadeInicio", "Acta de inicio", "acta_inicio", {"acta_inicio"}, "Adjunte el acta de inicio con fecha, equipo, responsabilidades, presupuesto y firmas. Verifique que sus datos coincidan con la formulación."),
    ("productos", "3Productos", "Productos", "producto_resultado", {"producto_resultado", "soporte_minciencias", "poster_producto"}, "Registre los productos y adjunte el resultado o soporte de cada uno. La revisión del administrador se realiza en el módulo de productos."),
    ("informes", "4InformesBimensuales", "Informes bimensuales", "informe_bimensual", {"informe_bimensual", "informe_bimestral"}, "Cargue un informe por cada bimestre de la vigencia. Indique el número de bimestre y describa actividades, avances, dificultades y evidencias."),
    ("cierre", "5ActaCierre", "Acta de cierre", "acta_cierre", {"acta_cierre", "informe_final"}, "Adjunte el acta de cierre firmada y el informe final técnico. Concilie los resultados, productos y ejecución del presupuesto."),
    ("evidencias", "6EvidenciasFotograficas", "Evidencias fotográficas", "evidencia_fotografica", {"evidencia_fotografica", "evidencia_video", "registro_evidencias"}, "Adjunte fotos o videos de las actividades. Describa la fecha, el lugar y su relación con los resultados del proyecto."),
    ("borradores", "7Borradoresyvarios", "Borradores y varios", "borrador_varios", {"borrador_varios", "nota_trabajo", "documento_apoyo"}, "Adjunte borradores, actas preliminares, minutas, notas de trabajo o documentos auxiliares del proyecto."),
)


def document_bytes(document: Documento) -> bytes | None:
    """Lee sólo archivos dentro del almacenamiento autorizado o base64 heredado."""
    root = Path(get_settings().STORAGE_DIR).resolve()
    if document.file_path:
        path = Path(document.file_path).resolve()
        candidates = (path, root / "documentos" / Path(document.file_path).name)
        for candidate in candidates:
            try:
                if candidate.is_relative_to(root) and candidate.is_file():
                    content = candidate.read_bytes()
                    if content:
                        return content
            except OSError:
                continue
    if document.data_base64:
        try:
            return base64.b64decode(document.data_base64, validate=True) or None
        except (ValueError, binascii.Error):
            return None
    return None


def project_documents(project: Proyecto, db: Session) -> list[Documento]:
    """Incluye soportes de productos vinculados sin mezclar proyectos."""
    product_ids = [str(product.id) for product in project.productos]
    documents = db.query(Documento).filter(or_(
        and_(Documento.entidad_tipo == "proyecto", Documento.entidad_id == str(project.id)),
        and_(Documento.entidad_tipo == "producto", Documento.entidad_id.in_(product_ids)),
    )).order_by(Documento.created_at, Documento.id).all()
    return [document for document in documents if is_latest_generation(document)]


def is_latest_generation(document):
    version = document.version_generada
    return version is None or version.version == max(item.version for item in version.borrador.versiones)


def generated_document_status(document):
    """Una versión generada requiere revisión vigente y contenido íntegro."""
    version = document.version_generada
    if version is None:
        return True, None
    if version.estado != "revisado":
        return False, "Revise el contenido de la versión generada antes de completar esta etapa."
    from app.services.documentation_state import current_snapshot, document_slots, version_is_current
    import hashlib
    draft = version.borrador
    project = draft.proyecto
    slot = next((item for item in document_slots(project) if item["clave"] == draft.clave), None)
    common_row = project.documentacion
    common, revision = (common_row.datos, common_row.revision) if common_row else ({}, 0)
    if slot is None or not version_is_current(version, current_snapshot(project, slot, common, draft.datos), revision, draft.revision):
        return False, "Los datos cambiaron. Genere y revise una nueva versión del documento."
    content = document_bytes(document)
    if content is None or hashlib.sha256(content).hexdigest() != version.sha256:
        return False, "El archivo generado cambió o no está disponible. Genere una nueva versión y revísela."
    if document.tipo == "acta_cierre" and version.snapshot["datos"].get("tipo_cierre") == "parcial":
        return False, "El acta corresponde a un cierre parcial; falta el acta de cierre final del proyecto."
    return True, None


def evaluate_project_file(project: Proyecto, db: Session) -> dict:
    """Comprueba disponibilidad, soportes por producto y bimestres distintos."""
    documents = project_documents(project, db)
    available = {str(doc.id): document_bytes(doc) is not None for doc in documents}
    generation_status = {str(doc.id): generated_document_status(doc) for doc in documents}
    stages = []
    missing = []
    expected = math.ceil(project.vigencia / 2) if project.vigencia and project.vigencia > 0 else None
    known_types = set().union(*(stage[4] for stage in STAGES))
    for stage_id, folder, title, upload_type, types, guide in STAGES:
        docs = [doc for doc in documents if doc.tipo in types and (stage_id == "productos" or doc.entidad_tipo == "proyecto")]
        usable = [doc for doc in docs if available[str(doc.id)] and generation_status[str(doc.id)][0] and (stage_id != "evidencias" or doc.tipo != "registro_evidencias")]
        pending = []
        pending.extend(generation_status[str(doc.id)][1] for doc in docs if generation_status[str(doc.id)][1])
        if not usable and stage_id != "borradores":
            pending.append(f"Adjunte un archivo disponible para {title.lower()}.")
        if stage_id == "productos":
            for product in project.productos:
                if not any(str(doc.entidad_id) == str(product.id) and doc.entidad_tipo == "producto" for doc in usable):
                    pending.append(f"Adjunte el soporte del producto: {product.nombre}.")
        if stage_id == "cierre":
            for kind, label in (("acta_cierre", "acta de cierre"), ("informe_final", "informe final técnico")):
                if not any(doc.tipo == kind for doc in usable):
                    pending.append(f"Adjunte el {label}.")
        periods = []
        if stage_id == "informes":
            if expected is None:
                pending.append("Defina la vigencia en meses para calcular los informes bimensuales requeridos.")
            else:
                covered = {doc.periodo_bimestre for doc in usable}
                periods = [period for period in range(1, expected + 1) if period not in covered]
                pending.extend(f"Adjunte el informe del bimestre {period}." for period in periods)
            if any(doc.periodo_bimestre is None for doc in usable):
                pending.append("Identifique el bimestre de los informes heredados sin período registrado.")
        stage = {
            "id": stage_id, "carpeta": folder, "titulo": title,
            "tipo_documento": upload_type, "guia": guide,
            "completo": not pending, "faltantes": pending,
            "documentos": [{
                "id": str(doc.id), "tipo": doc.tipo,
                "nombre_archivo": doc.nombre_archivo, "descripcion": doc.descripcion,
                "periodo_bimestre": doc.periodo_bimestre, "disponible": available[str(doc.id)],
                "estado_generacion": doc.version_generada.estado if doc.version_generada else None,
                "observacion_generacion": generation_status[str(doc.id)][1],
            } for doc in docs],
        }
        if stage_id == "informes":
            stage.update(informes_esperados=expected, bimestres_pendientes=periods)
        if stage_id == "productos":
            stage["productos"] = [{
                "id": str(product.id), "nombre": product.nombre,
                "soporte_disponible": any(doc.entidad_tipo == "producto" and str(doc.entidad_id) == str(product.id) for doc in usable),
            } for product in project.productos]
        stages.append(stage)
        missing.extend(pending)
    unclassified = [doc for doc in documents if doc.tipo not in known_types]
    technical_stages = [s for s in stages if s["id"] != "borradores"]
    complete_stages = sum(s["completo"] for s in technical_stages)
    return {
        "proyecto_id": str(project.id), "nombre": project.nombre,
        "codigo_sgps": project.codigo_sgps, "completo": complete_stages == len(technical_stages),
        "porcentaje_completitud": round(complete_stages / len(technical_stages) * 100, 1),
        "etapas": stages, "pendientes": missing,
        "documentos_sin_clasificar": [{"id": str(doc.id), "nombre_archivo": doc.nombre_archivo} for doc in unclassified],
        "alcance": "La comprobación documental verifica archivos y períodos registrados. La validez del contenido, las firmas y la versión institucional requieren revisión del responsable.",
    }


def build_project_file_zip(project: Proyecto, db: Session):
    """Exporta archivos reales, siete directorios normalizados de SharePoint y diagnóstico."""
    from app.services.project_file_import.export import export_folder, export_path, imported_sources
    report = evaluate_project_file(project, db)
    sources, folders = imported_sources(project, db)
    target = SpooledTemporaryFile(max_size=8 * 1024 * 1024, mode="w+b")
    try:
        with ZipFile(target, "w", compression=ZIP_DEFLATED) as archive:
            for stage in report["etapas"]:
                archive.writestr(stage["carpeta"] + "/", b"")
            archive.writestr("3Productos/1InformeFinal/", b"")
            archive.writestr("3Productos/2PosteryEventos/", b"")
            archive.writestr("3Productos/3.InnovacionGestionEmpresarial/", b"")
            for folder in sorted(folders):
                try:
                    folder = export_folder(folder) + "/"
                except ValueError:
                    continue
                if folder not in archive.namelist():
                    archive.writestr(folder, b"")
            archive.writestr("expediente.json", json.dumps(report, ensure_ascii=False, indent=2))
            archive.writestr("pendientes.txt", report["alcance"] + "\n\n" + ("\n".join(report["pendientes"]) or "Las etapas documentales están completas."))
            used = {name.casefold() for name in archive.namelist()}
            for document in project_documents(project, db):
                content = document_bytes(document)
                if content is None:
                    continue
                if document.tipo == "poster_producto":
                    folder = "3Productos/2PosteryEventos"
                elif document.tipo in {"soporte_minciencias", "certificacion_producto"}:
                    folder = "3Productos/3.InnovacionGestionEmpresarial"
                elif document.tipo == "producto_resultado":
                    folder = "3Productos/1InformeFinal"
                elif document.tipo in {"borrador_varios", "nota_trabajo", "documento_apoyo"}:
                    folder = "7Borradoresyvarios"
                else:
                    folder = next((stage[1] for stage in STAGES if document.tipo in stage[4]), "1ProyectoFomulado/Anexos")
                safe_name = re.sub(r"[^\w.() -]", "_", (document.nombre_archivo or "documento").replace("\\", "/").split("/")[-1]).replace("..", "_")[:180] or "documento"
                source = sources.get(str(document.id))
                path = source.ruta if source else f"{folder}/{document.id}_{safe_name}"
                archive.writestr(export_path(path, str(document.id), used), content)
        target.seek(0)
        return target
    except Exception:
        target.close()
        raise
