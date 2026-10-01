const APPRENTICE_MODULES = new Set([
  'dashboard', 'perfil', 'grupos', 'proyectos', 'mis-proyectos',
  'cronograma', 'retos', 'semilleros', 'repositorio', 'mensajes', 'notificaciones',
]);

const ADMIN_MODULES = new Set(['auditoria', 'configuracion', 'cvlac-admin', 'cvlac_admin']);
const STAFF_ROLES = new Set(['admin', 'investigador']);
const GROUP_HOME_ROLES = new Set(['admin', 'investigador', 'instructor', 'aprendiz']);

export function getHomeModule(role) {
  if (GROUP_HOME_ROLES.has(role)) return 'grupos';
  return 'dashboard';
}

export function canAccessModule(role, module) {
  if (!role || !module) return false;
  if (module === 'bitacora') return false;
  if (role === 'aprendiz') return APPRENTICE_MODULES.has(module);
  if (role === 'instructor') return module === 'grupos';
  if (!STAFF_ROLES.has(role)) return false;
  if (ADMIN_MODULES.has(module)) return role === 'admin';
  return true;
}

export function resolveAccessibleModule(role, module) {
  return canAccessModule(role, module) ? module : getHomeModule(role);
}

export function filterMenuGroups(role, groups) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(({ id }) => canAccessModule(role, id)),
    }))
    .filter(({ items }) => items.length > 0);
}

export function canUseQuickAction(role, actionId) {
  if (actionId === 'new-log') return false;
  if (actionId === 'my-projects') return role === 'aprendiz';
  if (role === 'aprendiz') return false;
  return STAFF_ROLES.has(role);
}

export function canStartModuleAction(role, module, form) {
  if (!canAccessModule(role, module)) return false;
  if (role === 'aprendiz' && form === 'create') return false;
  return true;
}

export function canUseGlobalSearch(role) {
  return STAFF_ROLES.has(role);
}

export function getVisibleSemilleroMembers(role, userId, apprentices = [], investigators = []) {
  if (STAFF_ROLES.has(role)) return { apprentices, investigators };
  if (role !== 'aprendiz' || userId === null || userId === undefined) {
    return { apprentices: [], investigators: [] };
  }

  const currentId = String(userId);
  return {
    apprentices: apprentices.filter((member) => {
      const memberId = member?.user_id ?? member?.id;
      return memberId !== null && memberId !== undefined && String(memberId) === currentId;
    }),
    investigators: [],
  };
}
