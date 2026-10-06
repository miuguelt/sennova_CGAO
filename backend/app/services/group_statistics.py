"""Estadísticas de grupo con progreso documental y los conteos institucionales existentes."""

import sqlalchemy as sa
from fastapi import HTTPException

from app.models import Grupo
from app.services.documentation_statistics import documentation_statistics, documentation_statistics_options


def group_statistics(grupo_id, db):
    """Calcula estadísticas e impacto real de un grupo de investigación desde la BD."""
    from app.models import Semillero, Proyecto, Producto, Aprendiz, Entregable
    from collections import Counter
    
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # 1. Semilleros del grupo
    semilleros = db.query(Semillero).filter(Semillero.grupo_id == str(grupo.id)).all()
    semillero_ids = [str(s.id) for s in semilleros]
    
    # 2. Integrantes del grupo
    integrantes = list(grupo.integrantes)
    if grupo.owner and grupo.owner not in integrantes:
        integrantes.append(grupo.owner)
    integrantes_ids = [str(u.id) for u in integrantes]
    
    # 3. Proyectos vinculados directamente al grupo, a sus semilleros o liderados por integrantes
    proyectos_query = db.query(Proyecto).options(*documentation_statistics_options()).filter(
        (Proyecto.grupo_id == str(grupo.id)) |
        (Proyecto.semillero_id.in_(semillero_ids) if semillero_ids else False) |
        (Proyecto.owner_id.in_(integrantes_ids) if integrantes_ids else False)
    )
    proyectos = proyectos_query.all()
    avance_documental, _ = documentation_statistics(proyectos)
    proyecto_ids = [str(p.id) for p in proyectos]
    
    # 4. Productos vinculados a proyectos o creados por integrantes
    productos = db.query(Producto).filter(
        (Producto.proyecto_id.in_(proyecto_ids)) | (Producto.owner_id.in_(integrantes_ids))
    ).all() if (proyecto_ids or integrantes_ids) else []
    
    # Categorización de productos Minciencias
    tipo_counts = Counter()
    for prod in productos:
        tipo_str = prod.tipo or 'Otros'
        if any(w in tipo_str.lower() for w in ['artículo', 'articulo', 'paper', 'revista', 'a1', 'a2']):
            tipo_counts['Artículos'] += 1
        elif any(w in tipo_str.lower() for w in ['software', 'aplicación', 'app', 'sistema', 'código', 'b1', 'b2']):
            tipo_counts['Software'] += 1
        elif any(w in tipo_str.lower() for w in ['prototipo', 'diseño', 'circuito', 'maqueta', 'c1', 'c2']):
            tipo_counts['Prototipos'] += 1
        elif any(w in tipo_str.lower() for w in ['libro', 'capítulo', 'manual', 'd1']):
            tipo_counts['Libros'] += 1
        elif any(w in tipo_str.lower() for w in ['consultoría', 'servicio', 'informe', 'técnico', 'apropiación', 'social', 'evento']):
            tipo_counts['Apropiación Social'] += 1
        else:
            tipo_counts['Otros'] += 1
            
    produccion_data = [
        {'name': 'Artículos', 'value': tipo_counts['Artículos']},
        {'name': 'Software', 'value': tipo_counts['Software']},
        {'name': 'Prototipos', 'value': tipo_counts['Prototipos']},
        {'name': 'Libros', 'value': tipo_counts['Libros']},
        {'name': 'Apropiación Social', 'value': tipo_counts['Apropiación Social']},
        {'name': 'Otros', 'value': tipo_counts['Otros']}
    ]
    
    # 5. Aprendices en semilleros del grupo
    total_aprendices = db.query(sa.func.count(Aprendiz.id)).filter(
        Aprendiz.semillero_id.in_(semillero_ids)
    ).scalar() if semillero_ids else 0
    
    # 6. Proyectos por Estado
    estados_proyectos = Counter(p.estado or 'Aprobado' for p in proyectos)
    proyectos_por_estado = [
        {'name': 'Aprobados', 'value': estados_proyectos.get('Aprobado', 0) + estados_proyectos.get('Formulación', 0) + estados_proyectos.get('En formulación', 0)},
        {'name': 'En Ejecución', 'value': estados_proyectos.get('Ejecución', 0) + estados_proyectos.get('En ejecución', 0) + estados_proyectos.get('Activo', 0)},
        {'name': 'Finalizados', 'value': estados_proyectos.get('Finalizado', 0) + estados_proyectos.get('finalizado', 0)},
        {'name': 'Cancelados/Otros', 'value': estados_proyectos.get('Cancelado', 0) + estados_proyectos.get('Suspendido', 0)}
    ]
    
    # 7. Semilleros por Línea de Investigación
    lineas_semilleros = Counter(s.linea_investigacion or 'Sin Línea Asignada' for s in semilleros)
    semilleros_por_linea = [
        {'name': linea[:28] + ('...' if len(linea) > 28 else ''), 'fullName': linea, 'value': count}
        for linea, count in lineas_semilleros.most_common(6)
    ]
    
    # 8. Estado CvLAC de Investigadores
    cvlac_actualizados = sum(1 for u in integrantes if str(getattr(u, 'estado_cv_lac', '')).lower() in ['actualizado', 'al día', 'vigente'])
    cvlac_desactualizados = sum(1 for u in integrantes if str(getattr(u, 'estado_cv_lac', '')).lower() in ['desactualizado', 'no actualizado', 'por actualizar', 'pendiente'])
    cvlac_sin = max(0, len(integrantes) - (cvlac_actualizados + cvlac_desactualizados))
    cvlac_stats = {
        'actualizados': cvlac_actualizados,
        'desactualizados': cvlac_desactualizados,
        'sin_cvlac': cvlac_sin,
        'total': len(integrantes)
    }
    
    # 9. Avance documental y conteos independientes de entregables
    entregables = db.query(Entregable).filter(
        Entregable.proyecto_id.in_(proyecto_ids)
    ).all() if proyecto_ids else []
    
    total_e = len(entregables)
    aprobados = len([e for e in entregables if e.estado == 'aprobado'])
    cumplimiento = avance_documental["porcentaje"]

    # 10. Horas formativas dedicadas
    horas_totales = sum(s.horas_dedicadas or 0 for s in semilleros)
    
    # 11. Presupuesto acumulado y ejecutado
    presupuesto_total = sum(float(p.presupuesto_total or 0) for p in proyectos)
    
    # Presupuesto ejecutado ponderado por el progreso de entregables de cada proyecto
    entregables_by_proj = {}
    for e in entregables:
        pid = str(e.proyecto_id)
        if pid not in entregables_by_proj:
            entregables_by_proj[pid] = {"total": 0, "aprobados": 0}
        entregables_by_proj[pid]["total"] += 1
        if e.estado == "aprobado":
            entregables_by_proj[pid]["aprobados"] += 1
            
    presupuesto_ejecutado = 0.0
    for p in proyectos:
        pid = str(p.id)
        p_budget = float(p.presupuesto_total or 0)
        p_ent = entregables_by_proj.get(pid, {"total": 0, "aprobados": 0})
        if p_ent["total"] > 0:
            p_prog = p_ent["aprobados"] / p_ent["total"]
        elif str(p.estado).lower() in ("finalizado", "completado"):
            p_prog = 1.0
        else:
            p_prog = 0.0
        presupuesto_ejecutado += p_budget * p_prog
        
    avance_promedio = cumplimiento
    
    # 12. Distribución temporal real
    from datetime import datetime, timezone
    meses_nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    mes_actual = datetime.now(timezone.utc).month
    
    impacto_regional = []
    for i in range(6):
        m_idx = (mes_actual - 6 + i) % 12
        m_num = m_idx + 1
        m_nombre = meses_nombres[m_idx]
        
        val = sum(1 for p in proyectos if p.created_at and p.created_at.month == m_num) + \
              sum(1 for pr in productos if pr.created_at and pr.created_at.month == m_num)
        
        impacto_regional.append({'month': m_nombre, 'actividad': val})
    
    return {
        "produccion": produccion_data,
        "proyectos_por_estado": proyectos_por_estado,
        "semilleros_por_linea": semilleros_por_linea,
        "cvlac_stats": cvlac_stats,
        "cumplimiento": cumplimiento,
        "avance_promedio": avance_promedio,
        "avance_documental": avance_documental,
        "entregables_totales": total_e,
        "entregables_aprobados": aprobados,
        "impacto_regional": impacto_regional,
        "total_semilleros": len(semilleros),
        "total_proyectos": len(proyectos),
        "total_productos": len(productos),
        "total_aprendices": total_aprendices or 0,
        "total_integrantes": len(integrantes),
        "horas_formativas": horas_totales,
        "presupuesto_total": presupuesto_total,
        "presupuesto_ejecutado": round(presupuesto_ejecutado, 2)
    }
