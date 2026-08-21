/**
 * Utilidades para navegación y redirección inteligente de notificaciones
 */

export const resolveNotificationTarget = (notification) => {
  if (!notification) return { module: null, action: null, label: null };

  const entidadTipo = (notification.entidad_tipo || '').toLowerCase();
  const tipo = (notification.tipo || '').toLowerCase();
  const entidadId = notification.entidad_id || null;

  // 1. Proyectos
  if (entidadTipo === 'proyecto' || tipo === 'proyecto') {
    return {
      module: 'proyectos',
      action: entidadId ? { module: 'proyectos', form: 'view', initialData: { id: entidadId } } : null,
      label: 'Ver Proyecto'
    };
  }

  // 2. Entregables / Cronograma
  if (entidadTipo === 'entregable' || tipo === 'entregable' || entidadTipo === 'cronograma') {
    return {
      module: 'cronograma',
      action: entidadId ? { module: 'cronograma', form: 'filter', initialData: { proyecto_id: entidadId, id: entidadId } } : null,
      label: 'Ver Entregables'
    };
  }

  // 3. Convocatorias
  if (entidadTipo === 'convocatoria' || tipo === 'convocatoria') {
    return {
      module: 'convocatorias',
      action: null,
      label: 'Ver Convocatorias'
    };
  }

  // 4. Productos Minciencias
  if (entidadTipo === 'producto' || tipo === 'producto') {
    return {
      module: 'productos',
      action: entidadId ? { module: 'productos', form: 'view', initialData: { id: entidadId } } : null,
      label: 'Ver Producto'
    };
  }

  // 5. Mensajes / Chats
  if (
    entidadTipo === 'mensaje' ||
    entidadTipo === 'mensajes' ||
    entidadTipo === 'user_message' ||
    entidadTipo === 'chat' ||
    tipo === 'mensaje' ||
    tipo === 'chat'
  ) {
    return {
      module: 'mensajes',
      action: entidadId ? {
        module: 'mensajes',
        form: 'chat',
        initialData: { id: entidadId, usuario_id: entidadId, contacto_id: entidadId }
      } : null,
      label: entidadId ? 'Ir al Chat' : 'Ir a Mensajes'
    };
  }

  // 6. Bitácoras
  if (entidadTipo === 'bitacora' || tipo === 'bitacora') {
    return {
      module: 'bitacora',
      action: null,
      label: 'Ver Bitácora'
    };
  }

  // 7. Perfil / CvLAC
  if (entidadTipo === 'perfil' || tipo === 'cvlac') {
    return {
      module: 'perfil',
      action: null,
      label: 'Ver Perfil / CvLAC'
    };
  }

  // 8. Semilleros
  if (entidadTipo === 'semillero' || entidadTipo === 'semilleros' || tipo === 'semillero') {
    return {
      module: 'semilleros',
      action: null,
      label: 'Ver Semillero'
    };
  }

  // 9. Grupos
  if (entidadTipo === 'grupo' || entidadTipo === 'grupos' || tipo === 'grupo') {
    return {
      module: 'grupos',
      action: null,
      label: 'Ver Grupo'
    };
  }

  // 10. Retos
  if (entidadTipo === 'reto' || entidadTipo === 'retos' || tipo === 'reto') {
    return {
      module: 'retos',
      action: null,
      label: 'Ver Reto'
    };
  }

  // 11. Reportes
  if (entidadTipo === 'reporte' || entidadTipo === 'reportes' || tipo === 'reporte') {
    return {
      module: 'reportes',
      action: null,
      label: 'Ver Reportes'
    };
  }

  // 12. Repositorio / Documentos
  if (entidadTipo === 'repositorio' || entidadTipo === 'documento' || entidadTipo === 'documentos') {
    return {
      module: 'repositorio',
      action: null,
      label: 'Ver Documentos'
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
