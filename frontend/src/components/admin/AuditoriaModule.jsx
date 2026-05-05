import React, { useState, useEffect } from 'react';
import {
  Shield, Search, Filter, Download, RefreshCw, X,
  Clock, User, Activity, AlertTriangle, CheckCircle2,
  FileText, Server, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { DashboardAPI } from '../../api/dashboard';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const METHOD_COLORS = {
  POST: 'success',
  PUT: 'warning',
  DELETE: 'danger',
  PATCH: 'warning',
  GET: 'info'
};

const AuditoriaModule = ({ onNotify }) => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, summaryData] = await Promise.all([
        DashboardAPI.getAuditLogs(page * pageSize, pageSize, methodFilter),
        DashboardAPI.getAuditSummary()
      ]);
      setLogs(logsData.logs || []);
      setTotal(logsData.total || 0);
      setSummary(summaryData);
    } catch (err) {
      onNotify?.('Error al cargar auditoría: ' + err.message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [page, methodFilter]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(search) ||
      log.endpoint?.toLowerCase().includes(search) ||
      log.ip_address?.toLowerCase().includes(search) ||
      log.method?.toLowerCase().includes(search)
    );
  });

  const exportToCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Email', 'Método', 'Endpoint', 'Código', 'IP'];
    const rows = filteredLogs.map(log => [
      log.created_at,
      log.user_nombre,
      log.user_email,
      log.method,
      log.endpoint,
      log.status_code,
      log.ip_address
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onNotify?.('Auditoría exportada exitosamente', 'success');
  };

  if (loading && logs.length === 0) {
    return (
      <div className="p-12 text-center">
        <Loader2 size={36} className="animate-spin mx-auto text-emerald-600 mb-3" />
        <p className="text-sm text-slate-500">Cargando auditoría del sistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1.5">
            <Shield size={15} aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">Sistema</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Auditoría Completa</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro de todas las operaciones del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportToCSV}>
            <Download size={15} className="mr-2" /> Exportar CSV
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw size={15} className="mr-2" /> Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-slate-50 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg"><Activity className="text-slate-600" size={18} /></div>
              <div>
                <p className="text-2xl font-extrabold text-slate-700 tabular-nums">{summary.total_logs}</p>
                <p className="text-xs font-medium text-slate-600">Total Logs</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><Clock className="text-emerald-600" size={18} /></div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{summary.logs_ultimos_7_dias}</p>
                <p className="text-xs font-medium text-emerald-600">Últimos 7 días</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Server className="text-blue-600" size={18} /></div>
              <div>
                <p className="text-2xl font-extrabold text-blue-700 tabular-nums">{summary.logs_ultimos_30_dias}</p>
                <p className="text-xs font-medium text-blue-600">Últimos 30 días</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="text-amber-600" size={18} /></div>
              <div>
                <p className="text-2xl font-extrabold text-amber-700 tabular-nums">
                  {summary.por_metodo?.find(m => m.method === 'DELETE')?.count || 0}
                </p>
                <p className="text-xs font-medium text-amber-600">Eliminaciones</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-colors"
                placeholder="Usuario, endpoint, IP..."
              />
            </div>
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Método HTTP</label>
            <select
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 bg-white"
            >
              <option value="">Todos</option>
              <option value="POST">POST (Crear)</option>
              <option value="PUT">PUT (Actualizar)</option>
              <option value="DELETE">DELETE (Eliminar)</option>
              <option value="PATCH">PATCH (Parcial)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Método</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Endpoint</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <FileText size={48} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-500">No se encontraron registros de auditoría.</p>
                  </td>
                </tr>
              ) : filteredLogs.map(log => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {new Date(log.created_at).toLocaleString('es-CO')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                          {log.user_nombre?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{log.user_nombre}</p>
                          <p className="text-xs text-slate-500">{log.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={METHOD_COLORS[log.method] || 'default'} className="font-mono text-xs">
                        {log.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {log.endpoint}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={log.status_code >= 200 && log.status_code < 300 ? 'success' : log.status_code >= 400 ? 'danger' : 'warning'}
                        className="text-xs"
                      >
                        {log.status_code}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        {expandedLog === log.id ? (
                          <ChevronUp size={16} className="text-slate-500" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-500" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedLog === log.id && log.payload_snapshot && (
                    <tr>
                      <td colSpan="6" className="px-4 py-3 bg-slate-50">
                        <div className="rounded-lg bg-slate-900 p-3 overflow-x-auto">
                          <p className="text-xs text-slate-400 mb-2">Payload Snapshot:</p>
                          <pre className="text-xs text-emerald-400 font-mono">
                            {JSON.stringify(log.payload_snapshot, null, 2)}
                          </pre>
                        </div>
                        {log.ip_address && (
                          <p className="text-xs text-slate-500 mt-2">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Mostrando {filteredLogs.length} de {total} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <span className="text-sm text-slate-600 px-2">
              Página {page + 1} de {Math.ceil(total / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * pageSize >= total}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AuditoriaModule;
