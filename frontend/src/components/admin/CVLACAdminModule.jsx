import React, { useState, useEffect } from 'react';
import {
  FileText, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Users, Search, User, ExternalLink, Edit2, X, Save, Bell, RefreshCw,
} from 'lucide-react';
import { CVLACAPI } from '../../api/cvlac';
import { UsuariosAPI } from '../../api/usuarios';
import { NotificacionesAPI } from '../../api/notificaciones';
import { CVLAC_URL_PLACEHOLDER } from '../../api/config';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const ESTADO_VARIANT = { actualizado: 'success', desactualizado: 'warning' };

const CVLACAdminModule = ({ currentUser, onNotify }) => {
  const [usuarios,         setUsuarios]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [estadoFilter,     setEstadoFilter]     = useState('todos');
  const [resumen,          setResumen]          = useState(null);
  const [selectedUser,     setSelectedUser]     = useState(null);
  const [showEditModal,    setShowEditModal]    = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [enviandoAlertas,  setEnviandoAlertas]  = useState(false);
  const [alertaResult,     setAlertaResult]     = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [todosUsuarios, resumenSistema] = await Promise.all([
        UsuariosAPI.list(),
        CVLACAPI.resumenSistema(),
      ]);
      setUsuarios(todosUsuarios.filter(u => u.isActive !== false));
      setResumen(resumenSistema);
    } catch (err) {
      onNotify?.('Error al cargar datos CVLAC: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const handleEnviarAlertas = async () => {
    const pendientes = usuariosSinCVLAC.length + usuariosDesactualizados.length;
    if (!window.confirm(`¿Enviar alertas a ${pendientes} investigadores con CVLAC pendiente?`)) return;
    setEnviandoAlertas(true);
    try {
      const result = await NotificacionesAPI.alertarCVLACDesactualizados();
      setAlertaResult(result);
      setTimeout(() => setAlertaResult(null), 5000);
    } catch (err) {
      onNotify?.('Error enviando alertas: ' + err.message, 'error');
    }
    setEnviandoAlertas(false);
  };

  const handleUpdateEstado = async (userId, nuevoEstado, cvLacUrl = null) => {
    setSaving(true);
    try {
      await UsuariosAPI.update(userId, {
        estadoCvLac: nuevoEstado,
        ...(cvLacUrl && { cvLacUrl }),
      });
      await loadData();
      setShowEditModal(false);
      setSelectedUser(null);
      onNotify?.('Estado CVLAC actualizado', 'success');
    } catch (err) {
      onNotify?.('Error actualizando estado: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const filtered = usuarios.filter(u => {
    const matchesSearch =
      u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado =
      estadoFilter === 'todos' ||
      (estadoFilter === 'sin'           && (!u.estadoCvLac || u.estadoCvLac === 'sin CVLAC')) ||
      (estadoFilter === 'actualizado'   && u.estadoCvLac === 'actualizado') ||
      (estadoFilter === 'desactualizado'&& u.estadoCvLac === 'desactualizado');
    return matchesSearch && matchesEstado;
  });

  const usuariosSinCVLAC       = usuarios.filter(u => !u.estadoCvLac || u.estadoCvLac === 'sin CVLAC');
  const usuariosActualizados   = usuarios.filter(u => u.estadoCvLac === 'actualizado');
  const usuariosDesactualizados= usuarios.filter(u => u.estadoCvLac === 'desactualizado');

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 size={36} className="animate-spin mx-auto text-emerald-600 mb-3" />
      <p className="text-sm text-slate-500">Cargando panel CVLAC...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1.5">
            <FileText size={15} aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">Administración</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Administración CVLAC</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión del estado de CVLAC de los investigadores</p>
        </div>
        <div className="flex items-center gap-2">
          {(usuariosSinCVLAC.length > 0 || usuariosDesactualizados.length > 0) && (
            <Button
              onClick={handleEnviarAlertas}
              variant="secondary"
              disabled={enviandoAlertas}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {enviandoAlertas
                ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                : <><Bell size={15} /> Enviar Alertas</>
              }
            </Button>
          )}
          <Button onClick={loadData} variant="secondary" aria-label="Actualizar datos">
            <RefreshCw size={15} aria-hidden="true" /> Actualizar
          </Button>
        </div>
      </div>

      {/* ── Alert result ── */}
      {alertaResult && (
        <Card className="p-4 bg-emerald-50 border-emerald-200" role="alert" aria-live="polite">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} aria-hidden="true" />
            <div>
              <p className="font-semibold text-emerald-800">{alertaResult.message}</p>
              <p className="text-sm text-emerald-600">Total notificados: {alertaResult.total_notificados}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg" aria-hidden="true"><CheckCircle2 className="text-emerald-600" size={18} /></div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{usuariosActualizados.length}</p>
              <p className="text-xs font-medium text-emerald-600">Actualizados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg" aria-hidden="true"><AlertTriangle className="text-amber-600" size={18} /></div>
            <div>
              <p className="text-2xl font-extrabold text-amber-700 tabular-nums">{usuariosDesactualizados.length}</p>
              <p className="text-xs font-medium text-amber-600">Desactualizados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-rose-50 border-rose-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg" aria-hidden="true"><XCircle className="text-rose-600" size={18} /></div>
            <div>
              <p className="text-2xl font-extrabold text-rose-700 tabular-nums">{usuariosSinCVLAC.length}</p>
              <p className="text-xs font-medium text-rose-600">Sin CVLAC</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg" aria-hidden="true"><Users className="text-slate-600" size={18} /></div>
            <div>
              <p className="text-2xl font-extrabold text-slate-700 tabular-nums">{resumen?.porcentaje_actualizados || 0}%</p>
              <p className="text-xs font-medium text-slate-600">Tasa Actualización</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Pending alert banner ── */}
      {usuariosSinCVLAC.length > 0 && (
        <Card className="p-4 bg-rose-50 border-rose-200" role="alert">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-rose-600 flex-shrink-0" size={20} aria-hidden="true" />
            <div>
              <p className="font-semibold text-rose-800">{usuariosSinCVLAC.length} investigadores sin CVLAC actualizado</p>
              <p className="text-sm text-rose-600">Es importante mantener el CVLAC actualizado para reportes institucionales.</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Filters ── */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="cvlac-search">Buscar investigador</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} aria-hidden="true" />
              <input
                id="cvlac-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-colors"
                placeholder="Nombre o email..."
              />
            </div>
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="cvlac-filter">Estado CVLAC</label>
            <select
              id="cvlac-filter"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 bg-white"
            >
              <option value="todos">Todos</option>
              <option value="sin">Sin CVLAC</option>
              <option value="actualizado">Actualizado</option>
              <option value="desactualizado">Desactualizado</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ── Table ── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Investigador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado CVLAC</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">URL CVLAC</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-400">
                    No se encontraron investigadores.
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
                        <User size={15} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{u.nombre}</p>
                        <p className="text-xs text-slate-400">{u.rol === 'admin' ? 'Administrador' : 'Investigador'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ESTADO_VARIANT[u.estadoCvLac] ?? 'danger'}>
                      {u.estadoCvLac || 'sin CVLAC'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.cvLacUrl ? (
                      <a
                        href={u.cvLacUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                        aria-label={`Ver CVLAC de ${u.nombre}`}
                      >
                        <ExternalLink size={13} aria-hidden="true" /> Ver CVLAC
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400">No registrada</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setSelectedUser(u); setShowEditModal(true); }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      aria-label={`Editar estado CVLAC de ${u.nombre}`}
                    >
                      <Edit2 size={15} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Edit modal ── */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Actualizar estado CVLAC">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowEditModal(false)} aria-hidden="true" />
          <Card variant="elevated" className="w-full max-w-md relative z-10 animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Actualizar Estado CVLAC</h2>
              <button
                onClick={() => setShowEditModal(false)}
                aria-label="Cerrar formulario"
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Investigador</p>
                <p className="font-semibold text-slate-900">{selectedUser.nombre}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="edit-estado">Estado CVLAC</label>
                <select
                  id="edit-estado"
                  value={selectedUser.estadoCvLac || 'sin CVLAC'}
                  onChange={(e) => setSelectedUser({ ...selectedUser, estadoCvLac: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 bg-white"
                >
                  <option value="actualizado">Actualizado</option>
                  <option value="desactualizado">Desactualizado</option>
                  <option value="sin CVLAC">Sin CVLAC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="edit-url">URL CVLAC</label>
                <input
                  id="edit-url"
                  type="url"
                  value={selectedUser.cvLacUrl || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, cvLacUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  placeholder={CVLAC_URL_PLACEHOLDER}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
              <Button
                variant="sena"
                onClick={() => handleUpdateEstado(selectedUser.id, selectedUser.estadoCvLac, selectedUser.cvLacUrl)}
                disabled={saving}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} aria-hidden="true" />}
                Guardar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CVLACAdminModule;
