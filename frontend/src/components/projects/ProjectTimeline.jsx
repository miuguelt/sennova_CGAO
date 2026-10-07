import React from 'react';
import { CheckCircle2, Calendar } from 'lucide-react';
import { documentationButtonClass } from './ProjectDocumentationFields';
import ProjectTimelineGantt from './ProjectTimelineGantt';
import { formsForPhase, formatProjectTimelineDate, PROJECT_PHASES } from './projectTimelineData';

export { formatProjectTimelineDate };

const states = { pendiente: 'Pendiente', en_revision: 'En revisión', aprobado: 'Aprobado', rechazado: 'Requiere ajustes' };

function registeredPhase(item) {
  return item.fase === 'Final' ? 'Fase Final' : item.fase;
}

function TimelinePhase({ phase, index, items, forms, onOpenForm }) {
  const relatedForms = formsForPhase(forms, phase.key);
  return <section aria-label={phase.key} className="relative mb-6 flex min-w-0 items-start gap-3 sm:gap-6">
    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-700 bg-white text-sm font-bold text-emerald-900">{index + 1}</span>
    <div className="min-w-0 flex-1 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-emerald-900">Hito metodológico</span>
          <h5 className="text-sm font-bold text-slate-900">{phase.title}</h5>
        </div>
        <span className="text-xs text-slate-700">{items.length} {items.length === 1 ? 'entregable' : 'entregables'}</span>
      </div>
      {items.length > 0 ? <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">{items.map(item => <article key={item.id} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h6 className="flex min-w-0 items-start gap-2 text-sm font-semibold text-slate-900"><CheckCircle2 size={17} className={`shrink-0 ${item.estado === 'aprobado' ? 'text-emerald-800' : 'text-slate-600'}`} aria-hidden="true" /><span className="min-w-0">{item.titulo || item.nombre || 'Entregable por nombrar'}</span></h6>
        <p className="flex items-center gap-2 font-mono text-xs tabular-nums text-slate-700"><Calendar size={14} aria-hidden="true" />{formatProjectTimelineDate(item.fecha_entrega || item.fecha_limite)}</p>
        {item.responsable_nombre && <p className="w-full text-sm text-slate-700">{item.responsable_nombre}</p>}
        {item.fase && !PROJECT_PHASES.some(phaseOption => phaseOption.key === registeredPhase(item)) && <p className="w-full text-sm text-amber-950">Fase registrada: {item.fase}</p>}
        <p className="text-xs font-semibold text-slate-700">{states[item.estado] || item.estado || 'Pendiente'}</p>
      </article>)}</div> : <p className="w-full text-sm text-slate-600">Aún no hay entregables registrados para esta fase.</p>}
      <section aria-label={`Formularios relacionados con ${phase.key}`} className="min-w-0 space-y-2 border-t border-slate-200 pt-3">
        <h6 className="text-sm font-semibold text-slate-900">Formularios relacionados</h6>
        {relatedForms.length ? <ul className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">{relatedForms.map(form => <li key={form.clave} className="min-w-0">
          <button type="button" className={`${documentationButtonClass} w-full justify-start text-left`} onClick={() => onOpenForm?.(form.clave)} aria-label={`Abrir formulario: ${form.titulo}`}>
            <span className="min-w-0 [overflow-wrap:anywhere]">Abrir formulario: {form.titulo}</span>
          </button>
        </li>)}</ul> : <p className="w-full text-sm text-slate-600">Aún no hay formularios de esta fase disponibles para el proyecto.</p>}
      </section>
    </div>
  </section>;
}

export default function ProjectTimeline({ entregables = [], cronograma = [], formularios = [], onEditPlanning, onOpenForm, today }) {
  const unassignedDeliverables = entregables.filter(item => !PROJECT_PHASES.some(phase => phase.key === registeredPhase(item)));
  const allPhases = [...PROJECT_PHASES];
  if (unassignedDeliverables.length) allPhases.push({ key: 'Sin fase asignada', title: 'Sin fase asignada', name: 'Sin fase asignada' });

  return <div className="min-w-0 space-y-6 py-4">
    <section aria-label="Cronograma de la documentación" className="min-w-0 space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5">
      <h4 className="font-bold text-slate-900">Planeación de actividades</h4>
      <p className="w-full text-sm text-slate-700">Estas actividades planeadas se toman de los datos compartidos. Su registro no acredita ejecución ni aprobación de entregables.</p>
      {cronograma.length ? <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">{cronograma.map((row, index) => <article key={row.id || index} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h5 className="text-sm font-semibold text-slate-900">{row.actividad || `Actividad ${index + 1}`}</h5>
        <dl className="space-y-2 text-sm text-slate-700">
          <div><dt className="font-semibold">Fase</dt><dd>{PROJECT_PHASES.find(phase => phase.key === row.fase)?.title || 'Por asignar'}</dd></div>
          <div><dt className="font-semibold">Período planeado</dt><dd>{row.fecha_textual || (row.fecha_inicio && row.fecha_fin ? `${formatProjectTimelineDate(row.fecha_inicio)} a ${formatProjectTimelineDate(row.fecha_fin)}` : 'Período por completar')}</dd></div>
          <div><dt className="font-semibold">Responsable</dt><dd>{row.encargado || 'Responsable por asignar'}</dd></div>
          <div><dt className="font-semibold">Lugar o modalidad</dt><dd>{row.lugar || 'Lugar por definir'}</dd></div>
          <div><dt className="font-semibold">Entregable previsto</dt><dd>{row.resultado || 'Resultado por completar'}</dd></div>
        </dl>
      </article>)}</div> : <p className="w-full text-sm text-slate-600">Completa las actividades, responsables, períodos y resultados en Documentación, en el paso Presupuesto y cronograma.</p>}
      {onEditPlanning && <button type="button" className={documentationButtonClass} onClick={onEditPlanning}>Completar fase, fechas y lugar en Documentación</button>}
    </section>
    <ProjectTimelineGantt activities={cronograma} today={today} onEditPlanning={onEditPlanning} />
    <div className="relative min-w-0">
      <div aria-hidden="true" className="absolute bottom-0 left-5 top-0 w-1 rounded-full bg-emerald-100" />
      {allPhases.map((phase, index) => <TimelinePhase key={phase.key} phase={phase} index={index}
        items={phase.key === 'Sin fase asignada' ? unassignedDeliverables : entregables.filter(item => registeredPhase(item) === phase.key)}
        forms={formularios} onOpenForm={onOpenForm} />)}
    </div>
  </div>;
}
