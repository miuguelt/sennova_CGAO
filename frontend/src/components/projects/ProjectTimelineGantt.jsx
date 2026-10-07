import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import { documentationButtonClass } from './ProjectDocumentationFields';
import { createGanttModel, formatProjectTimelineDate, PROJECT_PHASES } from './projectTimelineData';

const barClasses = {
  'Fase I': 'bg-sky-800',
  'Fase II': 'bg-emerald-800',
  'Fase III': 'bg-indigo-800',
  'Fase Final': 'bg-amber-800',
  unassigned: 'bg-slate-700',
};

export default function ProjectTimelineGantt({ activities = [], today: suppliedToday, onEditPlanning }) {
  const [now, setNow] = useState(() => suppliedToday || new Date());
  useEffect(() => {
    if (suppliedToday) { setNow(suppliedToday); return undefined; }
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [suppliedToday]);
  const model = createGanttModel(activities, now);
  const currentLabel = model.currentPhases.length
    ? `Fase prevista ahora: ${model.currentPhases.join(', ')}`
    : model.currentActivities?.length ? 'Hay una actividad prevista ahora, pero falta asignarle una fase.'
      : model.hasCalendarActivities ? 'No hay una actividad programada ahora.' : 'No se puede determinar la fase prevista ahora.';
  const currentPlaces = [...new Set((model.currentActivities || []).map(activity => activity.lugar).filter(Boolean))];
  const groups = [
    ...PROJECT_PHASES.map(phase => ({ key: phase.key, label: phase.title, rows: model.activities.filter(item => item.phase === phase.key) })),
    { key: 'unassigned', label: 'Sin fase asignada', rows: model.activities.filter(item => !item.phase) },
  ].filter(group => group.rows.length > 0);

  return <section aria-label="Diagrama de Gantt" className="min-w-0 space-y-4 rounded-2xl border border-indigo-200 bg-white p-4 sm:p-5">
    <div className="space-y-2">
      <h4 className="font-bold text-slate-900">Diagrama de Gantt del proyecto</h4>
      <p className="w-full text-sm text-slate-700">Las barras muestran períodos planeados, asignados a fases. La línea vertical indica hoy cuando coincide con el período visible; una barra no confirma que la actividad se haya ejecutado.</p>
      <p role="status" className="w-full rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">{currentLabel}</p>
      {model.currentActivities?.length > 0 && <p className="w-full text-sm text-slate-700">Lugar previsto ahora: {currentPlaces.length ? currentPlaces.join(', ') : 'por definir'}</p>}
    </div>
    {!model.hasCalendarActivities ? <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="w-full text-sm text-slate-700">Completa las fechas de inicio y fin en Datos compartidos para ubicar las actividades en el diagrama.</p>
      {onEditPlanning && <button type="button" className={documentationButtonClass} onClick={onEditPlanning}>Completar fechas, fase y lugar</button>}
    </div> : <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200" aria-label="Cronograma por fase y período">
      <div className="min-w-[680px] space-y-4 p-4">
        <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-4 border-b border-slate-200 pb-3">
          <span className="text-xs font-semibold text-slate-700">Fase y actividad</span>
          <div className="relative h-7" aria-label={`Desde ${formatProjectTimelineDate(model.start)} hasta ${formatProjectTimelineDate(model.end)}`}>
            {model.months.map(month => <span key={month.key} className="absolute top-1 text-xs font-semibold capitalize text-slate-700" style={{ left: `${month.left}%` }}>{month.label}</span>)}
          </div>
        </div>
        <div role="region" aria-label="Diagrama de Gantt del proyecto" className="space-y-4">
          {groups.map(group => <section key={group.key} aria-label={group.label} className="min-w-0 space-y-2">
            <h5 className="text-xs font-bold text-slate-800">{group.label}</h5>
            {group.rows.map(activity => {
              const hours = activity.hora_inicio && activity.hora_fin
                ? `${activity.hora_inicio} a ${activity.hora_fin}`
                : activity.hora_inicio || activity.hora_fin || 'Horario por definir';
              const place = activity.lugar || 'Lugar o modalidad por definir';
              const barLabel = `${activity.actividad || `Actividad ${activity.index + 1}`}, ${group.label}, ${formatProjectTimelineDate(activity.range.start)} a ${formatProjectTimelineDate(activity.range.end)}, ${hours}, ${place}`;
              return <article key={activity.id || activity.index} aria-label={barLabel} className="grid min-w-0 grid-cols-[190px_minmax(0,1fr)] items-center gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="w-full text-xs font-semibold text-slate-900 [overflow-wrap:anywhere]">{activity.actividad || `Actividad ${activity.index + 1}`}</p>
                  <p className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-slate-700"><CalendarDays size={13} aria-hidden="true" />{formatProjectTimelineDate(activity.range.start)} a {formatProjectTimelineDate(activity.range.end)}</p>
                  <p className="flex min-w-0 items-start gap-1.5 text-[11px] text-slate-700"><Clock3 size={13} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{hours}</span></p>
                  <p className="flex min-w-0 items-start gap-1.5 text-[11px] text-slate-700 [overflow-wrap:anywhere]"><MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{place}</span></p>
                </div>
                <div className="relative min-h-12 rounded-lg bg-slate-100">
                  {model.todayPosition !== null && <span aria-hidden="true" className="absolute inset-y-0 z-10 w-0.5 bg-rose-800" style={{ left: `${model.todayPosition}%` }} />}
                  <span aria-hidden="true" className={`absolute inset-y-2 flex min-w-[3px] items-center overflow-hidden rounded-md px-2 text-[10px] font-semibold text-white ${barClasses[activity.phase || 'unassigned']}${activity.activeNow ? ' ring-2 ring-rose-900 ring-offset-1' : ''}`} style={{ left: `${activity.left}%`, width: `${activity.width}%` }}>
                    <span className="truncate">{activity.actividad || 'Actividad planeada'}</span>
                  </span>
                </div>
              </article>;
            })}
          </section>)}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-xs text-slate-700">
          {PROJECT_PHASES.map(phase => <span key={phase.key} className="flex items-center gap-2"><span aria-hidden="true" className={`h-3 w-3 rounded-sm ${barClasses[phase.key]}`} />{phase.title}</span>)}
        </div>
      </div>
    </div>}
  </section>;
}
