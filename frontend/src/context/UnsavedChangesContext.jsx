import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../components/ui/Modal';

const Context = createContext(null);
const fallback = {
  registerSession: () => () => {},
  requestLeave: action => action(),
};

export function useUnsavedChangesGuard() {
  return useContext(Context) || fallback;
}

export function UnsavedChangesProvider({ children }) {
  const sessions = useRef(new Map());
  const pendingAction = useRef(null);
  const savingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const registerSession = useCallback((id, session) => {
    sessions.current.set(id, session);
    return () => sessions.current.delete(id);
  }, []);
  const requestLeave = useCallback(action => {
    if (savingRef.current) return;
    if (![...sessions.current.values()].some(session => session.dirty)) {
      action();
      return;
    }
    pendingAction.current = action;
    setError('');
    setPending(true);
  }, []);
  const value = useMemo(() => ({ registerSession, requestLeave }), [registerSession, requestLeave]);

  useEffect(() => {
    const beforeUnload = event => {
      if ([...sessions.current.values()].some(session => session.dirty)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  function continueEditing() {
    if (savingRef.current) return;
    pendingAction.current = null;
    setPending(false);
  }
  function finishLeaving() {
    const action = pendingAction.current;
    pendingAction.current = null;
    setPending(false);
    action();
  }
  function discardAndLeave() {
    for (const session of [...sessions.current.values()]) {
      if (session.dirty) session.discard?.();
    }
    finishLeaving();
  }
  async function saveAndLeave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      for (const session of [...sessions.current.values()]) {
        if (session.dirty && await session.save() !== true) {
          setError('No se pudieron guardar todos los cambios. Puedes seguir editando y revisar los datos pendientes.');
          return;
        }
      }
      finishLeaving();
    } catch (failure) {
      setError(`No se pudieron guardar los cambios: ${failure?.message || 'revisa la conexión'}. Puedes seguir editando o intentar de nuevo.`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <Context.Provider value={value}>{children}
    <Modal isOpen={pending} onClose={continueEditing} title="Cambios pendientes por guardar" variant="clean"
      closeOnEsc={!saving} closeOnBackdrop={!saving} showCloseButton={!saving}
      footer={<>
        <button type="button" disabled={saving} onClick={continueEditing} className="min-h-[44px] rounded-xl border px-4 py-2 font-semibold">Seguir editando</button>
        <button type="button" disabled={saving} onClick={discardAndLeave} className="min-h-[44px] rounded-xl border border-rose-300 px-4 py-2 font-semibold text-rose-800">Descartar y salir</button>
        <button type="button" disabled={saving} onClick={saveAndLeave} className="min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white">{saving ? 'Guardando…' : 'Guardar y salir'}</button>
      </>}>
      <p>El proyecto tiene cambios sin guardar. Guarda el trabajo, descártalo o vuelve a la edición.</p>
      {error && <p role="alert" className="text-rose-900">{error}</p>}
    </Modal>
  </Context.Provider>;
}
