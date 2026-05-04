import React, { useState, useEffect } from 'react';
import {
  Edit2, Save, Loader2, AlertCircle, CheckCircle, ExternalLink,
  FileText, Eye, Trash2, Upload, Hash, X,
} from 'lucide-react';
import { AuthAPI, CVLACAPI, DocumentosAPI, API_URL } from '../../api/index.js';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';

const ESTADO_VARIANT = { actualizado: 'success', desactualizado: 'warning' };

const PerfilModule = ({ currentUser, onUpdateUser, onNotify }) => {
  const [user,         setUser]         = useState(currentUser);
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [message,      setMessage]      = useState(null);
  const [cvDocument,   setCvDocument]   = useState(null);
  const [uploadingCV,  setUploadingCV]  = useState(false);
  const [validandoURL, setValidandoURL] = useState(false);
  const [urlValida,    setUrlValida]    = useState(null);

  useEffect(() => { loadUser(); loadCVDocument(); }, [currentUser.id]);

  useEffect(() => {
    if (user.cvLacUrl?.includes('scienti')) validarURL(user.cvLacUrl);
  }, [user.cvLacUrl]);

  const notify = (text, type = 'success') => {
    setMessage({ text, type });
    onNotify?.(text, type);
    setTimeout(() => setMessage(null), 4000);
  };

  const loadUser = async () => {
    try {
      const u = await AuthAPI.getMe();
      if (u) setUser(u);
    } catch { /* silent */ }
  };

  const loadCVDocument = async () => {
    try {
      const estado = await CVLACAPI.estadoUsuario(currentUser.id);
      if (estado.tiene_pdf) {
        setCvDocument({
          id: estado.documento_id,
          nombre_archivo: `CVLAC_${estado.nombre}.pdf`,
          created_at: estado.ultima_actualizacion,
        });
      } else {
        setCvDocument(null);
      }
    } catch {
      setCvDocument(null);
    }
  };

  const validarURL = async (url) => {
    if (!url?.includes('scienti')) { setUrlValida(null); return; }
    setValidandoURL(true);
    try {
      const resultado = await CVLACAPI.validarURL(url);
      setUrlValida(resultado.es_valida);
    } catch {
      setUrlValida(false);
    }
    setValidandoURL(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await onUpdateUser(user);
      setUser(updated);
      setEditing(false);
      notify('Perfil actualizado correctamente');
    } catch (err) {
      notify('Error al guardar: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { notify('El archivo no puede superar 10 MB', 'error'); return; }
    if (file.type !== 'application/pdf') { notify('Solo se permiten archivos PDF', 'error'); return; }
    setUploadingCV(true);
    try {
      await CVLACAPI.subirPDF(file, currentUser.id);
      await loadCVDocument();
      setUser({ ...user, estadoCvLac: 'actualizado' });
      notify('CVLAC subido correctamente');
    } catch (err) {
      notify('Error al subir CV: ' + err.message, 'error');
    }
    setUploadingCV(false);
  };

  const handleCVDelete = async () => {
    if (!window.confirm('¿Eliminar el CVLAC subido?')) return;
    try {
      await DocumentosAPI.delete(cvDocument.id);
      setCvDocument(null);
      setUser({ ...user, estadoCvLac: 'sin CVLAC' });
      notify('CVLAC eliminado');
    } catch (err) {
      notify('Error al eliminar CV: ' + err.message, 'error');
    }
  };

  const urlBorderClass =
    urlValida === true  ? 'border-emerald-300 focus-visible:ring-emerald-500' :
    urlValida === false ? 'border-rose-300 focus-visible:ring-rose-500' :
    'border-slate-200 focus-visible:ring-emerald-500';

  return (
    <div className="space-y-6 animate-fadeIn pb-20 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
        {!editing ? (
          <Button onClick={() => setEditing(true)} variant="primary">
            <Edit2 size={15} aria-hidden="true" /> Editar Perfil
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setEditing(false)} variant="secondary">Cancelar</Button>
            <Button onClick={handleSave} variant="sena" disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} aria-hidden="true" />}
              Guardar
            </Button>
          </div>
        )}
      </div>

      {/* ── Inline message ── */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}
          role="alert"
          aria-live="polite"
        >
          {message.type === 'error'
            ? <AlertCircle size={18} className="flex-shrink-0" aria-hidden="true" />
            : <CheckCircle  size={18} className="flex-shrink-0" aria-hidden="true" />
          }
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* ── Personal info ── */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Información Personal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nombre completo"    value={user.nombre || ''}          onChange={(e) => setUser({ ...user, nombre: e.target.value })}           disabled={!editing} />
              <Input label="Email institucional"value={user.email  || ''}          disabled />
              <Select
                label="Rol SENNOVA"
                options={['', 'Investigador Experto', 'Instructor Investigador', 'Responsable de Proyecto'].map(e => ({ value: e, label: e || 'Selecciona...' }))}
                value={user.rolSENNOVA || ''}
                onChange={(e) => setUser({ ...user, rolSENNOVA: e.target.value })}
                disabled={!editing}
              />
              <Select
                label="Nivel académico"
                options={['', 'Técnico', 'Tecnólogo', 'Pregrado', 'Especialización', 'Maestría', 'Doctorado'].map(e => ({ value: e, label: e || 'Selecciona...' }))}
                value={user.nivelAcademico || ''}
                onChange={(e) => setUser({ ...user, nivelAcademico: e.target.value })}
                disabled={!editing}
              />
              <Input label="Teléfono"   value={user.telefono  || ''} onChange={(e) => setUser({ ...user, telefono:  e.target.value })} disabled={!editing} />
              <Input label="Extensión"  value={user.extension || ''} onChange={(e) => setUser({ ...user, extension: e.target.value })} disabled={!editing} />
            </div>
          </Card>

          {/* ── Institutional info ── */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Información Institucional</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Sede"     value={user.sede     || 'CGAO Vélez'} disabled />
              <Input label="Regional" value={user.regional || 'Santander'}  disabled />
              <Input label="Horas mensuales"       type="number" value={user.horasMensuales   || ''} onChange={(e) => setUser({ ...user, horasMensuales:   parseInt(e.target.value) })} disabled={!editing} />
              <Input label="Meses de vinculación"  type="number" value={user.mesesVinculacion || ''} onChange={(e) => setUser({ ...user, mesesVinculacion: parseInt(e.target.value) })} disabled={!editing} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">

          {/* ── CVLAC ── */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">CVLAC</h3>
            <div className="space-y-4">

              {/* URL field */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-slate-700" htmlFor="cvlac-url">URL CVLAC</label>
                  {validandoURL && <Loader2 size={13} className="animate-spin text-slate-400" aria-label="Validando URL" />}
                  {urlValida === true  && <CheckCircle  size={13} className="text-emerald-500" aria-label="URL válida" />}
                  {urlValida === false && <AlertCircle  size={13} className="text-rose-500"    aria-label="URL inválida" />}
                </div>
                <div className="flex gap-2">
                  <input
                    id="cvlac-url"
                    type="url"
                    value={user.cvLacUrl || ''}
                    onChange={(e) => setUser({ ...user, cvLacUrl: e.target.value })}
                    disabled={!editing}
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${urlBorderClass}`}
                    placeholder="https://scienti.colciencias.gov.co:8084/cvlac/..."
                  />
                  {user.cvLacUrl && (
                    <a
                      href={user.cvLacUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      aria-label="Abrir CVLAC en nueva pestaña"
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  )}
                </div>
                {urlValida === false && (
                  <p className="text-xs text-rose-600 mt-1">
                    URL inválida. Formato esperado: scienti.colciencias.gov.co:8084/cvlac/visualizador/...
                  </p>
                )}
              </div>

              {/* Estado badge */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Estado CVLAC</p>
                <Badge variant={ESTADO_VARIANT[user.estadoCvLac] ?? 'danger'} dot>
                  {user.estadoCvLac || 'sin CVLAC'}
                </Badge>
                {editing && (
                  <Select
                    label=""
                    options={['actualizado', 'desactualizado', 'sin CVLAC'].map(e => ({ value: e, label: e }))}
                    value={user.estadoCvLac || 'sin CVLAC'}
                    onChange={(e) => setUser({ ...user, estadoCvLac: e.target.value })}
                    className="mt-2"
                  />
                )}
              </div>

              {/* CV PDF */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Documento CVLAC (PDF)</p>
                {cvDocument ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm text-emerald-700 truncate">{cvDocument.nombre_archivo}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <a
                          href={`${API_URL}/documentos/${cvDocument.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          aria-label="Ver documento CVLAC"
                        >
                          <Eye size={15} aria-hidden="true" />
                        </a>
                        <button
                          onClick={handleCVDelete}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          aria-label="Eliminar CVLAC"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Subido el {new Date(cvDocument.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-sm text-slate-500 mb-3">No hay CVLAC subido</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2">
                      {uploadingCV
                        ? <><Loader2 size={15} className="animate-spin" /> Subiendo...</>
                        : <><Upload size={15} aria-hidden="true" /> Subir CV PDF</>
                      }
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleCVUpload}
                        disabled={uploadingCV}
                        className="sr-only"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* ── Research lines ── */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Líneas de Investigación</h3>
            <div className="space-y-2">
              {(user.lineasInvestigacion || []).map((linea, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <Hash size={13} className="text-slate-400 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm flex-1 min-w-0 truncate">{linea}</span>
                  {editing && (
                    <button
                      onClick={() => setUser({ ...user, lineasInvestigacion: user.lineasInvestigacion.filter((_, i) => i !== idx) })}
                      className="ml-auto text-rose-400 hover:text-rose-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
                      aria-label={`Eliminar línea "${linea}"`}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {editing && (
                <input
                  type="text"
                  placeholder="Nueva línea... (Enter para agregar)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      setUser({ ...user, lineasInvestigacion: [...(user.lineasInvestigacion || []), e.target.value.trim()] });
                      e.target.value = '';
                    }
                  }}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PerfilModule;
