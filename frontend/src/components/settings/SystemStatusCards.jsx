import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Zap, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { SystemAPI } from '../../api/system';

const SystemStatusCards = ({ onNotify }) => {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    SystemAPI.getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const handleBackup = async () => {
    onNotify?.('Generando respaldo de base de datos...', 'info');
    try {
      const res = await SystemAPI.getBackup();
      if (res.url) {
        onNotify?.('Backup iniciado en servidor: ' + res.url, 'success');
      } else {
        onNotify?.('Copia de seguridad generada localmente', 'success');
      }
    } catch (err) {
      onNotify?.('Error al generar backup: ' + err.message, 'error');
    }
  };

  const handleClearCache = async () => {
    onNotify?.('Optimizando infraestructura...', 'info');
    try {
      await SystemAPI.clearCache();
      onNotify?.('Caché del sistema depurada correctamente', 'success');
    } catch (err) {
      onNotify?.('Error al limpiar caché', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Servidor API</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${health?.status === 'healthy' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className={`text-lg font-black tracking-tight ${health?.status === 'healthy' ? 'text-white' : 'text-rose-300'}`}>
              {health === null ? 'VERIFICANDO' : health?.status === 'healthy' ? 'ONLINE' : 'NO DISPONIBLE'}
            </span>
          </div>
        </div>
        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Latencia</p>
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-slate-400" />
            <span className="text-lg font-black text-slate-900 tracking-tight">N/D</span>
          </div>
        </div>
        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Almacenamiento</p>
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-slate-400" />
            <span className="text-lg font-black text-slate-900 tracking-tight">N/D</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] px-1">Herramientas de Recuperación</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleBackup}
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-[2rem] hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-300 transition-all text-left group"
          >
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl group-hover:scale-110 transition-transform">
              <Download size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Exportar Dump SQL</p>
              <p className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">Respaldo completo</p>
            </div>
          </button>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-[2rem] hover:shadow-xl hover:shadow-slate-200/50 hover:border-amber-300 transition-all text-left group"
          >
            <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl group-hover:scale-110 transition-transform">
              <RefreshCw size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Limpiar Caché RAG</p>
              <p className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">Optimizar memoria</p>
            </div>
          </button>
        </div>
      </div>

      <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-200 flex gap-4">
        <AlertTriangle className="text-amber-600 shrink-0" size={24} />
        <div>
          <p className="text-sm font-bold text-amber-900">Zona de Riesgo Administrativo</p>
          <p className="text-xs text-amber-800 leading-relaxed mt-1 font-medium">
            Cualquier modificación en esta sección puede afectar la disponibilidad de los servicios para todos los investigadores. Proceda con precaución.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusCards;
