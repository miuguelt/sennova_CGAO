"""
Router de Reportes SENNOVA
Generación de reportes consolidados para reportes trimestrales a nivel nacional
"""

from io import BytesIO
from datetime import datetime, timezone
import uuid
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_admin
from app.models import User, Proyecto, Grupo, Semillero, Producto, Convocatoria, Entregable, Documento

# Importar librerías de reportes
try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes SENNOVA"]
)


def get_estado_color(estado: str) -> str:
    """Retorna color para el estado del proyecto."""
    colors = {
        "Aprobado": "C6EFCE",
        "En ejecución": "B8CCE4",
        "Finalizado": "E2EFDA",
        "Rechazado": "FFC7CE",
        "Formulación": "FFEB9C",
        "Enviado": "BDD7EE"
    }
    return colors.get(estado, "FFFFFF")


@router.get("/proyectos-consolidado")
def generar_consolidado_proyectos(
    año: Optional[int] = Query(None, description="Año de los proyectos"),
    formato: Literal["excel", "csv"] = Query("excel", description="Formato de salida"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Genera reporte consolidado de proyectos para reportes SENNOVA.
    Incluye: proyectos, equipo, presupuesto, productos asociados.
    """
    if not EXCEL_AVAILABLE and formato == "excel":
        raise HTTPException(
            status_code=500,
            detail="openpyxl no está instalado. Ejecuta: pip install openpyxl"
        )
    
    # Consultar proyectos con relaciones
    query = db.query(Proyecto)
    if año:
        query = query.filter(Proyecto.vigencia == año)
    proyectos = query.all()
    
    if formato == "excel":
        return _generar_excel_consolidado(proyectos, db, año)
    else:
        return _generar_csv_consolidado(proyectos, año)


def _generar_excel_consolidado(proyectos, db, año_filtro):
    """Genera archivo Excel con formato SENNOVA."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Consolidado Proyectos"
    
    # Estilos
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    subheader_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    subheader_font = Font(bold=True, size=10)
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Título del reporte
    año_texto = str(año_filtro) if año_filtro else "Todos"
    ws["A1"] = f"CONSOLIDADO DE PROYECTOS SENNOVA - CGAO VÉLEZ"
    ws["A2"] = f"Año: {año_texto} | Generado: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
    ws["A3"] = f"Total proyectos: {len(proyectos)}"
    
    # Merge celdas título
    ws.merge_cells("A1:K1")
    ws.merge_cells("A2:K2")
    ws.merge_cells("A3:K3")
    
    ws["A1"].font = Font(bold=True, size=14)
    ws["A1"].alignment = Alignment(horizontal="center")
    ws["A2"].alignment = Alignment(horizontal="center")
    ws["A3"].alignment = Alignment(horizontal="center")
    
    # Headers de columnas (fila 5)
    headers = [
        "Código SGPS", "Nombre Corto", "Nombre Completo", "Estado", 
        "Vigencia", "Presupuesto Total", "Convocatoria", "Líder",
        "N° Miembros", "N° Productos", "Tipología"
    ]
    
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=5, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
    
    # Datos
    row = 6
    for proyecto in proyectos:
        # Contar miembros del equipo
        n_miembros = len(proyecto.equipo) if proyecto.equipo else 0
        
        # Contar productos
        n_productos = len(proyecto.productos) if hasattr(proyecto, 'productos') else 0
        
        # Obtener líder (owner o primer miembro)
        lider = proyecto.owner.nombre if proyecto.owner else "Sin asignar"
        
        # Convocatoria
        convocatoria = "N/A"
        if proyecto.convocatoria:
            convocatoria = proyecto.convocatoria.nombre
        
        data = [
            proyecto.codigo_sgps or "Sin código",
            proyecto.nombre_corto or proyecto.nombre[:50],
            proyecto.nombre,
            proyecto.estado,
            proyecto.vigencia or "N/A",
            proyecto.presupuesto_total or 0,
            convocatoria,
            lider,
            n_miembros,
            n_productos,
            proyecto.tipologia or "N/A"
        ]
        
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row, column=col, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="left" if col in [2, 3, 7, 8] else "center")
            
            # Color por estado
            if col == 4:  # Columna de estado
                cell.fill = PatternFill(
                    start_color=get_estado_color(str(value)),
                    end_color=get_estado_color(str(value)),
                    fill_type="solid"
                )
            
            # Formato moneda para presupuesto
            if col == 6 and value:
                cell.number_format = '$#,##0.00'
        
        row += 1
    
    # Ajustar anchos
    ws.column_dimensions['A'].width = 15
    ws.column_dimensions['B'].width = 25
    ws.column_dimensions['C'].width = 40
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 10
    ws.column_dimensions['F'].width = 18
    ws.column_dimensions['G'].width = 30
    ws.column_dimensions['H'].width = 25
    ws.column_dimensions['I'].width = 12
    ws.column_dimensions['J'].width = 12
    ws.column_dimensions['K'].width = 20
    
    # Guardar en memoria
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"consolidado_proyectos_{año_filtro or 'todos'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def _generar_csv_consolidado(proyectos, año_filtro):
    """Genera archivo CSV simple."""
    import csv
    output = BytesIO()
    
    headers = [
        "codigo_sgps", "nombre_corto", "nombre", "estado", 
        "vigencia", "presupuesto_total", "convocatoria", "lider",
        "num_miembros", "num_productos", "tipologia"
    ]
    
    writer = csv.writer(output)
    writer.writerow(headers)
    
    for proyecto in proyectos:
        n_miembros = len(proyecto.equipo) if proyecto.equipo else 0
        n_productos = len(proyecto.productos) if hasattr(proyecto, 'productos') else 0
        lider = proyecto.owner.nombre if proyecto.owner else "Sin asignar"
        convocatoria = proyecto.convocatoria.nombre if proyecto.convocatoria else "N/A"
        
        writer.writerow([
            proyecto.codigo_sgps or "",
            proyecto.nombre_corto or proyecto.nombre[:50],
            proyecto.nombre,
            proyecto.estado,
            proyecto.vigencia or "",
            proyecto.presupuesto_total or 0,
            convocatoria,
            lider,
            n_miembros,
            n_productos,
            proyecto.tipologia or ""
        ])
    
    output.seek(0)
    
    filename = f"consolidado_proyectos_{año_filtro or 'todos'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/grupos-consolidado")
def generar_consolidado_grupos(
    formato: Literal["excel", "csv"] = Query("excel"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Genera reporte consolidado de grupos de investigación."""
    if not EXCEL_AVAILABLE and formato == "excel":
        raise HTTPException(status_code=500, detail="openpyxl no está instalado")
    
    grupos = db.query(Grupo).all()
    
    if formato == "excel":
        wb = Workbook()
        ws = wb.active
        ws.title = "Grupos GRUPLAC"
        
        # Título
        ws["A1"] = "GRUPOS DE INVESTIGACIÓN - CGAO VÉLEZ"
        ws["A2"] = f"Total grupos: {len(grupos)} | Generado: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
        ws.merge_cells("A1:H1")
        ws.merge_cells("A2:H2")
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center")
        
        # Headers
        headers = ["Nombre", "Código GRUPLAC", "Clasificación", "Líder", 
                   "N° Integrantes", "N° Semilleros", "Fecha Creación", "Líneas de Investigación"]
        
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=5, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
        
        # Datos
        for row, grupo in enumerate(grupos, 6):
            n_integrantes = len(grupo.integrantes) if grupo.integrantes else 0
            n_semilleros = len(grupo.semilleros) if hasattr(grupo, 'semilleros') else 0
            lineas = ", ".join(grupo.lineas_investigacion or [])
            
            ws.cell(row=row, column=1, value=grupo.nombre)
            ws.cell(row=row, column=2, value=grupo.codigo_gruplac or "N/A")
            ws.cell(row=row, column=3, value=grupo.clasificacion or "No clasificado")
            ws.cell(row=row, column=4, value=grupo.owner.nombre if grupo.owner else "Sin líder")
            ws.cell(row=row, column=5, value=n_integrantes)
            ws.cell(row=row, column=6, value=n_semilleros)
            ws.cell(row=row, column=7, value=grupo.created_at.strftime('%Y-%m-%d') if grupo.created_at else "N/A")
            ws.cell(row=row, column=8, value=lineas)
        
        # Ajustar anchos
        for i, width in enumerate([30, 20, 15, 25, 12, 12, 15, 40], 1):
            ws.column_dimensions[chr(64+i)].width = width
        
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=consolidado_grupos_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )
    else:
        # CSV
        import csv
        output = BytesIO()
        writer = csv.writer(output)
        writer.writerow(["nombre", "codigo_gruplac", "clasificacion", "lider", "integrantes", "semilleros", "lineas"])
        
        for grupo in grupos:
            writer.writerow([
                grupo.nombre,
                grupo.codigo_gruplac or "",
                grupo.clasificacion or "",
                grupo.owner.nombre if grupo.owner else "",
                len(grupo.integrantes) if grupo.integrantes else 0,
                len(grupo.semilleros) if hasattr(grupo, 'semilleros') else 0,
                ", ".join(grupo.lineas_investigacion or [])
            ])
        
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=consolidado_grupos_{datetime.now().strftime('%Y%m%d')}.csv"}
        )


@router.get("/productos-consolidado")
def generar_consolidado_productos(
    año: Optional[int] = Query(None, description="Año de publicación"),
    verificados_only: bool = Query(False, description="Solo productos verificados"),
    formato: Literal["excel", "csv"] = Query("excel"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Genera reporte de productos para convocatorias de recategorización."""
    if not EXCEL_AVAILABLE and formato == "excel":
        raise HTTPException(status_code=500, detail="openpyxl no está instalado")
    
    query = db.query(Producto)
    if año:
        query = query.filter(Producto.fecha_publicacion >= f"{año}-01-01", 
                            Producto.fecha_publicacion <= f"{año}-12-31")
    if verificados_only:
        query = query.filter(Producto.is_verificado == True)
    
    productos = query.all()
    
    if formato == "excel":
        wb = Workbook()
        ws = wb.active
        ws.title = "Productos Verificados"
        
        # Título
        ws["A1"] = "PRODUCTOS DE INVESTIGACIÓN - CGAO VÉLEZ"
        filtro_texto = f"Año: {año}" if año else "Todos los años"
        filtro_texto += " | Solo verificados" if verificados_only else ""
        ws["A2"] = f"{filtro_texto} | Total: {len(productos)} | Generado: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
        ws.merge_cells("A1:I1")
        ws.merge_cells("A2:I2")
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center")
        
        # Headers
        headers = ["Tipo", "Nombre", "Descripción", "Fecha Publicación", 
                   "DOI", "Verificado", "Proyecto Asociado", "Autor", "URL"]
        
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=5, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
        
        # Datos
        for row, producto in enumerate(productos, 6):
            proyecto_nombre = producto.proyecto.nombre_corto if producto.proyecto else "Sin proyecto"
            
            ws.cell(row=row, column=1, value=producto.tipo)
            ws.cell(row=row, column=2, value=producto.nombre)
            ws.cell(row=row, column=3, value=producto.descripcion or "")
            ws.cell(row=row, column=4, value=producto.fecha_publicacion or "N/A")
            ws.cell(row=row, column=5, value=producto.doi or "N/A")
            ws.cell(row=row, column=6, value="Sí" if producto.is_verificado else "No")
            ws.cell(row=row, column=7, value=proyecto_nombre)
            ws.cell(row=row, column=8, value=producto.owner.nombre if producto.owner else "N/A")
            ws.cell(row=row, column=9, value=producto.url or "N/A")
        
        # Ajustar anchos
        for i, width in enumerate([15, 35, 40, 15, 25, 12, 25, 30, 30], 1):
            ws.column_dimensions[chr(64+i)].width = width
        
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        suffix = f"{año or 'todos'}_{'verificados' if verificados_only else 'todos'}"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=consolidado_productos_{suffix}_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )
    else:
        # CSV
        import csv
        output = BytesIO()
        writer = csv.writer(output)
        writer.writerow(["tipo", "nombre", "descripcion", "fecha_publicacion", "doi", "verificado", "proyecto", "url"])
        
        for producto in productos:
            writer.writerow([
                producto.tipo,
                producto.nombre,
                producto.descripcion or "",
                producto.fecha_publicacion or "",
                producto.doi or "",
                "Sí" if producto.is_verificado else "No",
                producto.proyecto.nombre_corto if producto.proyecto else "",
                producto.url or ""
            ])
        
        output.seek(0)
        suffix = f"{año or 'todos'}_{'verificados' if verificados_only else 'todos'}"
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=consolidado_productos_{suffix}_{datetime.now().strftime('%Y%m%d')}.csv"}
        )


@router.get("/semilleros-consolidado")
def generar_consolidado_semilleros(
    formato: Literal["excel", "csv"] = Query("excel"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Genera certificación de semilleros con aprendices para reportes."""
    if not EXCEL_AVAILABLE and formato == "excel":
        raise HTTPException(status_code=500, detail="openpyxl no está instalado")
    
    semilleros = db.query(Semillero).all()
    
    if formato == "excel":
        wb = Workbook()
        ws = wb.active
        ws.title = "Semilleros y Aprendices"
        
        # Título
        ws["A1"] = "SEMILLEROS DE INVESTIGACIÓN - CGAO VÉLEZ"
        ws["A2"] = f"Total semilleros: {len(semilleros)} | Generado: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
        ws.merge_cells("A1:G1")
        ws.merge_cells("A2:G2")
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center")
        
        # Headers
        headers = ["Nombre Semillero", "Grupo Vinculado", "Líder", "Fecha Creación",
                   "N° Aprendices", "Estado"]
        
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=5, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
        
        # Datos
        for row, semillero in enumerate(semilleros, 6):
            n_aprendices = len(semillero.aprendices) if hasattr(semillero, 'aprendices') else 0
            grupo_nombre = semillero.grupo.nombre if semillero.grupo else "Sin grupo"
            
            ws.cell(row=row, column=1, value=semillero.nombre)
            ws.cell(row=row, column=2, value=grupo_nombre)
            ws.cell(row=row, column=3, value=semillero.owner.nombre if semillero.owner else "Sin líder")
            ws.cell(row=row, column=4, value=semillero.created_at.strftime('%Y-%m-%d') if semillero.created_at else "N/A")
            ws.cell(row=row, column=5, value=n_aprendices)
            ws.cell(row=row, column=6, value=semillero.estado)
        
        # Ajustar anchos
        for i, width in enumerate([30, 25, 25, 15, 12, 12], 1):
            ws.column_dimensions[chr(64+i)].width = width
        
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=consolidado_semilleros_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )
    else:
        # CSV
        import csv
        output = BytesIO()
        writer = csv.writer(output)
        writer.writerow(["nombre", "grupo", "lider", "fecha_creacion", "aprendices", "estado"])
        
        for semillero in semilleros:
            writer.writerow([
                semillero.nombre,
                semillero.grupo.nombre if semillero.grupo else "",
                semillero.owner.nombre if semillero.owner else "",
                semillero.created_at.strftime('%Y-%m-%d') if semillero.created_at else "",
                len(semillero.aprendices) if hasattr(semillero, 'aprendices') else 0,
                semillero.estado
            ])
        
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=consolidado_semilleros_{datetime.now().strftime('%Y%m%d')}.csv"}
        )


@router.get("/estadisticas-resumen")
def get_estadisticas_resumen(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retorna estadísticas consolidadas para dashboard de reportes."""
    current_year = datetime.now().year
    
    # Conteos generales
    total_proyectos = db.query(Proyecto).count()
    total_grupos = db.query(Grupo).count()
    total_semilleros = db.query(Semillero).count()
    total_productos = db.query(Producto).count()
    total_investigadores = db.query(User).filter(User.rol == 'investigador').count()
    
    # Proyectos por estado
    proyectos_por_estado = {}
    for estado in ["Formulación", "Enviado", "Aprobado", "En ejecución", "Finalizado", "Rechazado"]:
        count = db.query(Proyecto).filter(Proyecto.estado == estado).count()
        proyectos_por_estado[estado] = count
    
    # Proyectos por vigencia
    proyectos_por_año = {}
    for año in range(current_year - 2, current_year + 2):
        count = db.query(Proyecto).filter(Proyecto.vigencia == año).count()
        if count > 0:
            proyectos_por_año[str(año)] = count
    
    # Productos por tipo
    productos_por_tipo = {}
    for tipo in ["software", "articulo", "capitulo_libro", "patente", "ponencia", "video", "prototipo"]:
        count = db.query(Producto).filter(Producto.tipo == tipo).count()
        if count > 0:
            productos_por_tipo[tipo] = count
    
    # Productos verificados vs pendientes
    productos_verificados = db.query(Producto).filter(Producto.is_verificado == True).count()
    productos_pendientes = total_productos - productos_verificados
    
    # Grupos por clasificación GRUPLAC
    grupos_por_clasificacion = {}
    for clasif in ["A1", "A", "B", "C", "D", "Reconocido", "No clasificado"]:
        count = db.query(Grupo).filter(Grupo.clasificacion == clasif).count()
        if count > 0:
            grupos_por_clasificacion[clasif] = count
    
    return {
        "totales": {
            "proyectos": total_proyectos,
            "grupos": total_grupos,
            "semilleros": total_semilleros,
            "productos": total_productos,
            "investigadores": total_investigadores
        },
        "proyectos_por_estado": proyectos_por_estado,
        "proyectos_por_año": proyectos_por_año,
        "productos_por_tipo": productos_por_tipo,
        "productos_verificacion": {
            "verificados": productos_verificados,
            "pendientes": productos_pendientes,
            "tasa_verificacion": round(productos_verificados / total_productos * 100, 2) if total_productos > 0 else 0
        },
        "grupos_por_clasificacion": grupos_por_clasificacion,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/talento-consolidado")
def generar_consolidado_talento(
    formato: Literal["excel", "csv"] = Query("excel"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Genera reporte consolidado de talento humano e investigadores."""
    investigadores = db.query(User).filter(User.rol == 'investigador').all()
    
    if formato == "excel" and EXCEL_AVAILABLE:
        wb = Workbook()
        ws = wb.active
        ws.title = "Talento SENNOVA"
        
        headers = ["Nombre", "Email", "Regional", "Sede", "Nivel Académico", "Impacto", "Estado"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True)
            
        for row, inv in enumerate(investigadores, 2):
            ws.cell(row=row, column=1, value=inv.nombre)
            ws.cell(row=row, column=2, value=inv.email)
            ws.cell(row=row, column=3, value=inv.regional or "SANTANDER")
            ws.cell(row=row, column=4, value=inv.sede or "CGAO")
            ws.cell(row=row, column=5, value=inv.nivel_academico or "N/A")
            ws.cell(row=row, column=6, value=f"{getattr(inv, 'impacto', 0)}%")
            ws.cell(row=row, column=7, value="Activo" if inv.is_active else "Inactivo")
            
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=reporte_talento_sennova.xlsx"}
        )
    else:
        # Fallback to CSV
        import csv
        output = BytesIO()
        writer = csv.writer(output)
        writer.writerow(["nombre", "email", "sede", "nivel_academico", "estado"])
        for inv in investigadores:
            writer.writerow([inv.nombre, inv.email, inv.sede or "", inv.nivel_academico or "", "Activo" if inv.is_active else "Inactivo"])
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=reporte_talento.csv"})


@router.get("/investigador/{user_id}/certificado")
def generar_certificado_investigador(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Genera un certificado de participación en PDF para un investigador."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Investigador no encontrado")
        
    # En un sistema real, usaríamos ReportLab o similar para generar un PDF profesional
    # Aquí simulamos la generación enviando un "documento" de texto formateado como PDF
    output = BytesIO()
    content = f"""
    SENA - SERVICIO NACIONAL DE APRENDIZAJE
    CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE - CGAO
    SISTEMA SENNOVA
    
    CERTIFICA QUE:
    
    {user.nombre.upper()}
    Identificado(a) con correo institucional {user.email}
    
    Ha participado activamente como INVESTIGADOR en el ecosistema SENNOVA CGAO,
    liderando y apoyando proyectos de ciencia, tecnología e innovación.
    
    Válido para la vigencia actual.
    
    Generado electrónicamente el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    Código de Verificación: {str(uuid.uuid4())[:8]}
    """
    output.write(content.encode('utf-8'))
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificado_{user_id}.pdf"}
    )
