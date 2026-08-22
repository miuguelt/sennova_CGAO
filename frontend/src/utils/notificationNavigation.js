/**
 * Utilidades para navegación y redirección inteligente de notificaciones
 */

export const resolveNotificationTarget = (notification) => {
  if (!notification) return { module: null, action: null, label: null };

  const entidadTipo = (notification.entidad_tipo || '').toLowerCase();
  const tipo = (notification.tipo || '').toLowerCase();
  const entidadId = notification.entidad_id || null;
  const titulo = (notification.titulo || '').toLowerCase();
  const mensaje = (notification.mensaje || '').toLowerCase();

  // 1. Mensajes / Chats directos
  if (
    entidadTipo === 'mensaje' ||
    entidadTipo === 'mensajes' ||
    entidadTipo === 'user_message' ||
    entidadTipo === 'chat' ||
    entidadTipo === 'direct_message' ||
    tipo === 'mensaje' ||
    tipo === 'chat' ||
    titulo.startsWith('mensaje de') ||
    titulo.includes('nuevo mensaje')
  ) {
    let senderName = null;
    const rawTitle = notification.titulo || '';
    const match = rawTitle.match(/^mensaje\s+de\s*:\s*(.+)$/i) ||
                  rawTitle.match(/^mensaje\s+de\s+(.+)$/i);
    if (match && match[1]) {
      senderName = match[1].trim();
    }

    return {
      module: 'mensajes',
      action: {
        module: 'mensajes',
        form: 'chat',
        initialData: {
          id: entidadId || null,
          usuario_id: entidadId || null,
          contacto_id: entidadId || null,
          nombre: senderName || null,
          search: senderName || null,
          actionTimestamp: Date.now()
        }
      },
      label: 'Ir al Chat'
    };
  }

  // 2. Proyectos
  if (
    entidadTipo === 'proyecto' ||
    entidadTipo === 'proyectos' ||
    tipo === 'proyecto' ||
    tipo === 'proyectos' ||
    titulo.includes('proyecto')
  ) {
    return {
      module: 'proyectos',
      action: entidadId ? { module: 'proyectos', form: 'view', initialData: { id: entidadId } } : null,
      label: entidadId ? 'Ver Proyecto' : 'Ver Proyectos'
    };
  }

  // 3. Entregables / Cronograma / Hitos
  if (
    entidadTipo === 'entregable' ||
    entidadTipo === 'entregables' ||
    tipo === 'entregable' ||
    tipo === 'entregables' ||
    entidadTipo === 'cronograma' ||
    tipo === 'cronograma' ||
    entidadTipo === 'hito' ||
    entidadTipo === 'hitos' ||
    entidadTipo === 'tarea' ||
    entidadTipo === 'tareas' ||
    titulo.includes('entregable') ||
    titulo.includes('cronograma') ||
    titulo.includes('hito')
  ) {
    return {
      module: 'cronograma',
      action: entidadId ? {
        module: 'cronograma',
        form: 'view',
        initialData: { id: entidadId, entregable_id: entidadId, proyecto_id: entidadId }
      } : null,
      label: entidadId ? 'Ver Entregable' : 'Ver Cronograma'
    };
  }

  // 4. Convocatorias
  if (
    entidadTipo === 'convocatoria' ||
    entidadTipo === 'convocatorias' ||
    tipo === 'convocatoria' ||
    tipo === 'convocatorias' ||
    titulo.includes('convocatoria')
  ) {
    return {
      module: 'convocatorias',
      action: entidadId ? { module: 'convocatorias', form: 'view', initialData: { id: entidadId } } : null,
      label: entidadId ? 'Ver Convocatoria' : 'Ver Convocatorias'
    };
  }

  // 5. Productos Minciencias
  if (
    entidadTipo === 'producto' ||
    entidadTipo === 'productos' ||
    tipo === 'producto' ||
    tipo === 'productos' ||
    tipo === 'minciencias' ||
    titulo.includes('producto')
  ) {
    return {
      module: 'productos',
      action: entidadId ? { module: 'productos', form: 'view', initialData: { id: entidadId } } : null,
      label: entidadId ? 'Ver Producto' : 'Ver Productos'
    };
  }

  // 6. Semilleros
  if (
    entidadTipo === 'semillero' ||
    entidadTipo === 'semilleros' ||
    tipo === 'semillero' ||
    tipo === 'semilleros' ||
    titulo.includes('semillero')
  ) {
    return {
      module: 'semilleros',
      action: entidadId ? { module: 'semilleros', form: 'view', initialData: { id: entidadId } } : null,
      label: entidadId ? 'Ver Semillero' : 'Ver Semilleros'
    };
  }

  // 7. Retos
  if (
    entidadTipo === 'reto' ||
    entidadTipo === 'retos' ||
    tipo === 'reto' ||
    tipo === 'retos' ||
    entidadTipo === 'banco_retos' ||
    titulo.includes('reto')
  ) {
    return {
      module: 'retos',
      action: entidadId ? { module: 'retos', form: 'view', initialData: { id: entidadId } } : null,
      label: entidadId ? 'Ver Reto' : 'Ver Banco de Retos'
    };
  }

  // 8. Grupos
  if (
    entidadTipo === 'grupo' ||
    entidadTipo === 'grupos' ||
    tipo === 'grupo' ||
    tipo === 'grupos' ||
    entidadTipo === 'grupo_investigacion' ||
    titulo.includes('grupo de investigación')
  ) {
    return {
      module: 'grupos',
      action: entidadId ? { module: 'grupos', form: 'view', initialData: { id: entidadId } } : null,
      label: entidadId ? 'Ver Grupo' : 'Ver Grupo CGAO'
    };
  }

  // 9. Bitácoras
  if (
    entidadTipo === 'bitacora' ||
    entidadTipo === 'bitacoras' ||
    tipo === 'bitacora' ||
    tipo === 'bitacoras' ||
    titulo.includes('bitácora') ||
    titulo.includes('bitacora')
  ) {
    return {
      module: 'bitacora',
      action: entidadId ? { module: 'bitacora', form: 'view', initialData: { id: entidadId } } : null,
      label: entidadId ? 'Ver Bitácora' : 'Ir a Bitácoras'
    };
  }

  // 10. Perfil / CvLAC
  if (
    entidadTipo === 'perfil' ||
    entidadTipo === 'cvlac' ||
    entidadTipo === 'cvlac_admin' ||
    tipo === 'perfil' ||
    tipo === 'cvlac' ||
    tipo === 'cvlac-admin' ||
    titulo.includes('cvlac') ||
    mensaje.includes('cvlac')
  ) {
    return {
      module: 'perfil',
      action: null,
      label: 'Ver Perfil / CvLAC'
    };
  }

  // 11. Presupuesto
  if (
    entidadTipo === 'presupuesto' ||
    tipo === 'presupuesto' ||
    entidadTipo === 'rubro' ||
    tipo === 'rubros' ||
    titulo.includes('presupuesto')
  ) {
    return {
      module: 'presupuesto',
      action: entidadId ? { module: 'presupuesto', form: 'view', initialData: { id: entidadId, proyecto_id: entidadId } } : null,
      label: 'Ver Presupuesto'
    };
  }

  // 12. Reportes
  if (
    entidadTipo === 'reporte' ||
    entidadTipo === 'reportes' ||
    tipo === 'reporte' ||
    tipo === 'reportes' ||
    titulo.includes('reporte')
  ) {
    return {
      module: 'reportes',
      action: null,
      label: 'Ver Reportes'
    };
  }

  // 13. Repositorio / Documentos
  if (
    entidadTipo === 'repositorio' ||
    entidadTipo === 'documento' ||
    entidadTipo === 'documentos' ||
    tipo === 'repositorio' ||
    tipo === 'documento' ||
    titulo.includes('documento')
  ) {
    return {
      module: 'repositorio',
      action: null,
      label: 'Ver Documentos'
    };
  }

  // 14. Investigadores
  if (entidadTipo === 'investigador' || entidadTipo === 'investigadores' || tipo === 'investigador') {
    return {
      module: 'investigadores',
      action: null,
      label: 'Ver Investigadores'
    };
  }

  // 15. Aprendices
  if (entidadTipo === 'aprendiz' || entidadTipo === 'aprendices' || tipo === 'aprendiz') {
    return {
      module: 'aprendices',
      action: null,
      label: 'Ver Aprendices'
    };
  }

  // 16. Auditoría
  if (entidadTipo === 'auditoria' || tipo === 'auditoria') {
    return {
      module: 'auditoria',
      action: null,
      label: 'Ver Auditoría'
    };
  }

  return {
    module: null,
    action: null,
    label: null
  };
};

export const navigateNotification = (notification, { onNavigate, onModuleAction }) => {
  const target = resolveNotificationTarget(notification);
  if (target.action && onModuleAction) {
    onModuleAction(target.action);
    return true;
  }
  if (target.module && onNavigate) {
    onNavigate(target.module);
    return true;
  }
  if (onNavigate) {
    onNavigate('notificaciones');
    return true;
  }
  return false;
};
