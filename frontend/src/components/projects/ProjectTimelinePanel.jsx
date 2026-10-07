import React, { useEffect, useState } from 'react';
import { ProyectosAPI } from '../../api/proyectos';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { subscribeToDataRefresh } from '../../utils/dataRefresh';
import ProjectTimeline from './ProjectTimeline';
import { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectTimelinePanel({ projectId, onEditPlanning, onOpenForm, refreshVersion }) {
  const [record, setRecord] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sequence, setSequence] = useState(0);
  function reload() { setSequence(value => value + 1); }
  useEffect(() => subscribeToDataRefresh(({ endpoint }) => {
    if (/\/(proyectos|entregables|documentos)(\/|\?|$)/.test(endpoint)) reload();
  }), []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRecord(null); setForms([]);
    Promise.all([ProyectosAPI.get(projectId), ProjectDocumentationAPI.get(projectId)]).then(([project, documentation]) => {
      if (active) {
        setRecord(project);
        setForms(documentation.documentos || []);
      }
    }).catch(cause => {
      if (active) setError(cause.message || 'No fue posible consultar el cronograma. Intenta de nuevo.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, refreshVersion, sequence]);
  return <div className="min-w-0 space-y-4">
    {loading && <div role="status" className="animate-pulse space-y-3 rounded-2xl bg-white p-4 text-sm text-slate-700">Consultando cronograma…<div className="h-20 rounded-xl bg-slate-100" /></div>}
    {error && <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p className="w-full">{error}</p><button type="button" className={documentationButtonClass} onClick={reload}>Reintentar cronograma</button></div>}
    {record && <ProjectTimeline entregables={record.entregables || []} cronograma={record.cronograma_documental || []} formularios={forms} onEditPlanning={onEditPlanning} onOpenForm={onOpenForm} />}
  </div>;
}
