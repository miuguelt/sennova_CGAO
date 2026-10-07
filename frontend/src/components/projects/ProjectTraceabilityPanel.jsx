import React from 'react';
import { CheckCircle2, Circle, Clock, FolderOpen } from 'lucide-react';

const SSoT_FOLDERS = [
  { id: '1ProyectoFomulado', label: '1. Formulación' },
  { id: '2ActadeInicio', label: '2ActadeInicio' },
  { id: '3Productos', label: '3Productos' },
  { id: '4InformesBimensuales', label: '4InformesBimensuales' },
  { id: '5ActaCierre', label: '5ActaCierre' },
  { id: '6EvidenciasFotograficas', label: '6EvidenciasFotograficas' },
  { id: '7Borradoresyvarios', label: '7Borradoresyvarios' }
];

export default function ProjectTraceabilityPanel({ documentos }) {
  const getStatus = (doc) => {
    if (doc.historial && doc.historial.some(v => v.estado === 'revisado' && v.vigente && v.disponible)) return 'completo';
    if (doc.historial && doc.historial.some(v => v.vigente && v.disponible)) return 'generado';
    const hasData = Object.keys(doc.datos || {}).length > 0;
    if (hasData) return 'borrador';
    return 'falta';
  };

  const docsByFolder = {};
  SSoT_FOLDERS.forEach(f => {
    docsByFolder[f.id] = [];
  });

  documentos?.forEach(doc => {
    const folder = doc.carpeta;
    let targetFolder = folder === '1ProyectoFormulado' ? '1ProyectoFomulado' : folder;
    
    if (!docsByFolder[targetFolder]) {
      if (!docsByFolder['7Borradoresyvarios']) docsByFolder['7Borradoresyvarios'] = [];
      targetFolder = '7Borradoresyvarios';
    }
    
    docsByFolder[targetFolder].push({
      ...doc,
      status: getStatus(doc)
    });
  });

  let totalDocs = 0;
  let completedDocs = 0;

  Object.values(docsByFolder).forEach(list => {
    list.forEach(doc => {
      totalDocs++;
      if (doc.status === 'completo' || doc.status === 'generado') {
        completedDocs++;
      }
    });
  });


  return (
    <section aria-label="Trazabilidad del expediente" className="space-y-4 rounded-2xl border border-blue-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Trazabilidad del expediente</h3>
          <p className="mt-1 text-sm text-slate-600">
            Consulta qué documentos tienen un archivo vigente y cuáles requieren actualización.
          </p>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700">{completedDocs} de {totalDocs} documentos con archivo vigente</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SSoT_FOLDERS.map(folder => {
          const docs = docsByFolder[folder.id];
          if (!docs || docs.length === 0) return null;
          
          return (
            <div key={folder.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen size={18} className="text-blue-700" />
                <h4 className="font-bold text-slate-800 text-sm">{folder.label}</h4>
              </div>
              <ul className="space-y-2">
                {docs.map(doc => {
                  let Icon = Circle;
                  let iconColor = 'text-slate-300';
                  let statusText = 'Falta';
                  
                  if (doc.status === 'completo') {
                    Icon = CheckCircle2;
                    iconColor = 'text-emerald-600';
                    statusText = 'Revisado';
                  } else if (doc.status === 'generado') {
                    Icon = CheckCircle2;
                    iconColor = 'text-blue-500';
                    statusText = 'Generado';
                  } else if (doc.status === 'borrador') {
                    Icon = Clock;
                    iconColor = 'text-amber-500';
                    statusText = 'En borrador';
                  }

                  return (
                    <li key={doc.clave} className="flex items-start gap-2 text-xs">
                      <Icon size={14} className={`mt-0.5 shrink-0 ${iconColor}`} />
                      <div>
                        <span className="font-semibold text-slate-700 block">
                          {doc.titulo} ({doc.formato?.toUpperCase() || 'DOC'})
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${iconColor}`}>{statusText}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
