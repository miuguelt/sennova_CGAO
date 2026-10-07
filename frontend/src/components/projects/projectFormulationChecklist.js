export function checklistStorageKey(projectId, currentUserId, stepId) {
  if (!projectId || !currentUserId || !stepId) return '';
  return `sennova:revision-personal:${encodeURIComponent(currentUserId)}:${encodeURIComponent(projectId)}:${encodeURIComponent(stepId)}`;
}

export function checklistFingerprint(fieldKeys = [], values = {}, criteria = []) {
  const content = JSON.stringify([fieldKeys.slice().sort().map(key => [key, values[key] ?? null]), criteria], (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) : value);
  let hash = 2166136261;
  for (let index = 0; index < content.length; index++) hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
}

export function readPersonalChecklist(key, fingerprint) {
  if (!key) return { checked: {}, failed: false, stale: false };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (!saved) return { checked: {}, failed: false, stale: false };
    if (saved.fingerprint !== fingerprint) return { checked: {}, failed: false, stale: true };
    const checked = {};
    for (const [index, value] of Object.entries(saved.checked || {})) if (/^\d+$/.test(index) && typeof value === 'boolean') checked[index] = value;
    return { checked, failed: false, stale: false };
  } catch { return { checked: {}, failed: true, stale: false }; }
}

export function writePersonalChecklist(key, fingerprint, checked) {
  if (!key) return false;
  try {
    localStorage.setItem(key, JSON.stringify({ fingerprint, checked }));
    return true;
  } catch { return false; }
}
