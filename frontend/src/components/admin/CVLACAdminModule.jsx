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
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

const ESTADO_VARIANT = { 
  'Actualizado': 'success', 
  'Desactualizado': 'warning', 
  'Sin CVLAC': 'danger',
  'No actualizado': 'danger'
};

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
  const [confirmAlertas,   setConfirmAlertas]   = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [todosUsuarios, resumenSistema] = await Promise.all([
        UsuariosAPI.list(),
        CVLACAPI.resumenSistema(),
      ]);
      setUsuarios(todosUsuarios.filter(u => u.is_active !== false && u.rol !== 'aprendiz'));
      setResumen(resumenSistema);
    } catch (err) {
      onNotify?.('Error al cargar datos CVLAC: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const handleEnviarAlertas = () => {
    setConfirmAlertas(true);
  };

  const handleUpdateEstado = async (userId, nuevoEstado, cv_lac_url = null) => {
    setSaving(true);
    try {
      await UsuariosAPI.update(userId, {
        estado_cv_lac: nuevoEstado,
        ...(cv_lac_url && { cv_lac_url }),
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
      (estadoFilter === 'sin'           && (!u.estado_cv_lac || u.estado_cv_lac === 'Sin CVLAC' || u.estado_cv_lac === 'No actualizado')) ||
      (estadoFilter === 'actualizado'   && u.estado_cv_lac === 'Actualizado') ||
      (estadoFilter === 'desactualizado'&& u.estado_cv_lac === 'Desactualizado');
    return matchesSearch && matchesEstado;
  });

  const usuariosSinCVLAC       = usuarios.filter(u => !u.estado_cv_lac || u.estado_cv_lac === 'Sin CVLAC' || u.estado_cv_lac === 'No actualizado');
  const usuariosActualizados   = usuarios.filter(u => u.estado_cv_lac === 'Actualizado');
  const usuariosDesactualizados= usuarios.filter(u => u.estado_cv_lac === 'Desactualizado');

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
        <Card className="p-4 bg-emerald-50 border-emerald-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg" aria-hidden="true"><CheckCircle2 className="text-emerald-800" size={18} /></div>
            <div>
              <p className="text-2xl font-black text-emerald-900 tabular-nums">{usuariosActualizados.length}</p>
              <p className="text-xs font-bold text-emerald-800">Actualizados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-50 border-amber-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg" aria-hidden="true"><AlertTriangle className="text-amber-800" size={18} /></div>
            <div>
              <p className="text-2xl font-black text-amber-950 tabular-nums">{usuariosDesactualizados.length}</p>
              <p className="text-xs font-bold text-amber-900">Desactualizados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-rose-50 border-rose-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg" aria-hidden="true"><XCircle className="text-rose-800" size={18} /></div>
            <div>
              <p className="text-2xl font-black text-rose-950 tabular-nums">{usuariosSinCVLAC.length}</p>
              <p className="text-xs font-bold text-rose-900">Sin CVLAC</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg" aria-hidden="true"><Users className="text-slate-800" size={18} /></div>
            <div>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{resumen?.porcentaje_actualizados || 0}%</p>
              <p className="text-xs font-bold text-slate-700">Tasa Actualización</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Pending alert banner ── */}
      {usuariosSinCVLAC.length > 0 && (
        <Card className="p-4 bg-rose-50 border-rose-300" role="alert">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-rose-700 flex-shrink-0" size={20} aria-hidden="true" />
            <div>
              <p className="font-bold text-rose-950">{usuariosSinCVLAC.length} investigadores sin CVLAC actualizado</p>
              <p className="text-sm text-rose-800 font-medium">Es importante mantener el CVLAC actualizado para reportes institucionales.</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Filters ── */}
      <Card className="p-4 border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-800 mb-1" htmlFor="cvlac-search">Buscar investigador</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={15} aria-hidden="true" />
              <input
                id="cvlac-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 transition-colors"
                placeholder="Nombre o email..."
              />
            </div>
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-bold text-slate-800 mb-1" htmlFor="cvlac-filter">Estado CVLAC</label>
            <select
              id="cvlac-filter"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 bg-white"
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
      <Card className="border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-700 uppercase tracking-wide">Investigador</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-700 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-700 uppercase tracking-wide">Estado CVLAC</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-700 uppercase tracking-wide">URL CVLAC</th>
                <th className="text-center px-4 py-3 text-xs font-black text-slate-700 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-600 font-bold">
                    No se encontraron investigadores.
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
                        <User size={15} className="text-emerald-800" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{u.nombre}</p>
                        <p className="text-xs text-slate-600 font-semibold">{u.rol === 'admin' ? 'Administrador' : 'Investigador'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800 font-medium">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ESTADO_VARIANT[u.estado_cv_lac] || 'danger'}>
                      {u.estado_cv_lac || 'Sin CVLAC'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.cv_lac_url ? (
                      <a
                        href={u.cv_lac_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
                        aria-label={`Ver CVLAC de ${u.nombre}`}
                      >
                        <ExternalLink size={13} aria-hidden="true" /> Ver CVLAC
                      </a>
                    ) : (
                      <span className="text-sm text-slate-600 font-medium">No registrada</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setSelectedUser(u); setShowEditModal(true); }}
                      className="p-2 text-emerald-800 hover:bg-emerald-100/70 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
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

      {/* ── Edit Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showEditModal && !!selectedUser}
        onClose={() => setShowEditModal(false)}
        size="md"
        variant="sena"
        icon={FileText}
        title="Actualizar Estado CVLAC"
        subtitle={selectedUser?.nombre}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)} className="w-full sm:w-auto justify-center">Cancelar</Button>
            <Button
              variant="sena"
              onClick={() => handleUpdateEstado(selectedUser.id, selectedUser.estado_cv_lac, selectedUser.cv_lac_url)}
              disabled={saving}
              className="w-full sm:w-auto justify-center"
            >
              {saving ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Save size={15} className="mr-1.5" />}
              Guardar Cambios
            </Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Investigador</p>
              <p className="font-bold text-slate-900 text-sm">{selectedUser.nombre}</p>
              <p className="text-xs text-slate-500">{selectedUser.email}</p>
            </div>
            <Select
              label="Estado CVLAC"
              value={selectedUser.estado_cv_lac || 'Sin CVLAC'}
              onChange={(val) => setSelectedUser({ ...selectedUser, estado_cv_lac: val?.target ? val.target.value : val })}
              options={[
                { value: 'Actualizado', label: 'Actualizado' },
                { value: 'Desactualizado', label: 'Desactualizado' },
                { value: 'Sin CVLAC', label: 'Sin CVLAC' }
              ]}
            />
            <Input
              label="URL CVLAC"
              type="url"
              value={selectedUser.cv_lac_url || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, cv_lac_url: e.target.value })}
              placeholder={CVLAC_URL_PLACEHOLDER}
            />
          </div>
        )}
      </Modal>

      {/* ── Confirm Enviar Alertas Dialog ── */}
      <ConfirmDialog
        isOpen={confirmAlertas}
        onClose={() => setConfirmAlertas(false)}
        onConfirm={async () => {
          setConfirmAlertas(false);
          setEnviandoAlertas(true);
          try {
            const result = await NotificacionesAPI.alertarCVLACDesactualizados();
            setAlertaResult(result);
            setTimeout(() => setAlertaResult(null), 5000);
          } catch (err) {
            onNotify?.('Error enviando alertas: ' + err.message, 'error');
          }
          setEnviandoAlertas(false);
        }}
        title="¿Enviar Alertas de CVLAC?"
        description={`Se enviarán notificaciones automáticas a ${usuariosSinCVLAC.length + usuariosDesactualizados.length} investigadores con CVLAC pendiente o desactualizado.`}
        confirmText="Enviar Notificaciones"
        variant="warning"
      />
    </div>
  );
};

export default CVLACAdminModule;
