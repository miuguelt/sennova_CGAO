import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import Modal from './ProjectDocumentationModal';
import { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectFormulationNavigation({ open, route, activeStepId, onSelect, onClose }) {
  return <Modal isOpen={open} onClose={onClose} title="Etapas del proyecto" variant="clean" size="xl" className="documentation-dialog"
    footer={<button type="button" className={documentationButtonClass} onClick={onClose}>Volver al formulario</button>}>
    <p className="text-sm leading-relaxed text-slate-700">Sigue este orden sugerido o vuelve a una etapa cuando necesites ajustar el contenido. Los cambios se conservan mientras permanezcas en el proyecto; guarda las etapas para registrarlos.</p>
    <nav aria-label="Pasos de formulación" className="formulation-route-grid">
      {route.pasos.map((step, index) => <button key={step.id} type="button" aria-current={step.id === activeStepId ? 'step' : undefined}
        onClick={() => onSelect(step.id)} aria-description={step.completo ? step.fuente === 'generacion' ? 'Borrador generado' : 'Campos diligenciados' : 'Campos pendientes'}>
        {step.completo ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
        <span>{index + 1}. {step.titulo}</span><small aria-hidden="true">{step.completo ? step.fuente === 'generacion' ? 'Borrador generado' : 'Campos diligenciados' : 'Campos pendientes'}</small>
      </button>)}
    </nav>
    {route.siguiente_paso && <button type="button" className={documentationButtonClass} onClick={() => onSelect(route.siguiente_paso)}>Ir a este paso sugerido</button>}
  </Modal>;
}
