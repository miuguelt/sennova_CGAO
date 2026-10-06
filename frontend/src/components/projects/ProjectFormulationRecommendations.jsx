import React, { useEffect, useState } from 'react';
import Modal from './ProjectDocumentationModal';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectFormulationRecommendations({ projectId, fields, values, onClose }) {
  const [request, setRequest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setTips([]); setFailed(false);
    const textFields = fields.filter(field => ['textarea', 'text'].includes(field.type) || ['texto_largo', 'texto'].includes(field.tipo));
    Promise.allSettled(textFields.map(field => ProjectDocumentationAPI.getRecommendation(projectId, field.key, values[field.key] || '')))
      .then(results => {
        if (!active) return;
        setTips(results.flatMap((result, index) => result.status === 'fulfilled' && Array.isArray(result.value?.recomendaciones) && result.value.recomendaciones.length
          ? [{ campo: textFields[index].label || textFields[index].key, tips: result.value.recomendaciones }] : []));
        setFailed(results.some(result => result.status === 'rejected'));
        setLoading(false);
      });
    return () => { active = false; };
  }, [projectId, request, fields, values]);
  return <Modal isOpen title="Orientaciones metodológicas" onClose={onClose} variant="clean" size="xl" className="documentation-dialog"
    footer={<button type="button" className={documentationButtonClass} onClick={onClose}>Volver al formulario</button>}>
    {loading && <div role="status" className="animate-pulse space-y-3 text-sm text-slate-700">Consultando orientaciones…<div className="h-20 rounded-xl bg-slate-100" /></div>}
    {!loading && failed && <div role="alert" className="space-y-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-900">
      <p>No fue posible consultar las orientaciones de algunos campos. Puedes seguir escribiendo o reintentar.</p>
      <button type="button" className={documentationButtonClass} onClick={() => setRequest(previous => previous + 1)}>Reintentar orientaciones</button>
    </div>}
    {!loading && !failed && !tips.length && <p className="text-sm text-slate-700">No hay orientaciones adicionales para los textos de esta etapa.</p>}
    {tips.map((item, index) => <section key={index} className="space-y-2 rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">{item.campo}</h3>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">{item.tips.map((tip, tipIndex) => <li key={tipIndex}>{tip}</li>)}</ul>
    </section>)}
  </Modal>;
}
