import React from 'react';
import { History, Server, Cpu, HardDrive, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';

const InfraHealthCard = ({ stats }) => (
  <Card className="p-6 border border-slate-200 shadow-sm bg-white space-y-6">
    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
      <History size={14} className="text-indigo-600" /> Salud de la Infraestructura
    </h3>

    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 md:gap-4">
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Server size={18} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-800">Latencia BD</span>
        </div>
        <span className="text-xs font-black text-slate-700">
          {stats?.db_latency_ms !== undefined ? `${stats.db_latency_ms} ms` : 'N/A'}
        </span>
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Cpu size={18} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-800">Estado DB</span>
        </div>
        <span className={`text-xs font-black uppercase ${stats?.system_status === 'operativo' ? 'text-emerald-700' : 'text-slate-500'}`}>
          {stats?.system_status || 'N/D'}
        </span>
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <HardDrive size={18} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-800">Uso de Disco</span>
        </div>
        <span className="text-xs font-black text-indigo-700">
          {stats?.disk_usage_pct !== undefined ? `${stats.disk_usage_pct}%` : 'N/A'}
        </span>
      </div>
    </div>

    {stats?.system_status && (
      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 flex gap-3">
        <AlertTriangle className="text-indigo-700 shrink-0" size={18} />
        <p className="text-[10px] text-indigo-950 font-bold leading-relaxed">Sistemas reportan estado nominal.</p>
      </div>
    )}
  </Card>
);

export default InfraHealthCard;
