import React from 'react';

export default function ProjectDocumentationContext({ project }) {
  const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const objectives = Array.isArray(project.objetivos_especificos) ? project.objetivos_especificos : [];
  return <section aria-label="Información autoritativa del proyecto" className="min-w-0 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
    <p className="w-full font-semibold text-slate-900">{project.nombre}{project.codigo_sgps ? ` · SGPS ${project.codigo_sgps}` : ''}</p>
    <dl className="min-w-0 space-y-3">
      <div><dt className="font-semibold text-slate-900">Objetivo general</dt><dd className="w-full">{project.objetivo_general || 'Complete el objetivo general en la información del proyecto.'}</dd></div>
      <div><dt className="font-semibold text-slate-900">Objetivos específicos</dt><dd>{objectives.length ? <ul className="w-full list-disc pl-5">{objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul> : 'Complete los objetivos específicos en la información del proyecto.'}</dd></div>
      <div><dt className="font-semibold text-slate-900">Duración</dt><dd>{project.vigencia ? `${project.vigencia} meses` : 'Registre la duración del proyecto para definir sus bimestres.'}</dd></div>
      <div><dt className="font-semibold text-slate-900">Presupuesto del proyecto</dt><dd className="font-mono tabular-nums">{project.presupuesto_total == null ? 'Sin presupuesto registrado.' : money.format(project.presupuesto_total)}</dd></div>
    </dl>
    <p className="w-full">Estos datos se toman de la información del proyecto. Complete allí cualquier dato faltante. Las fotos, firmas y resultados deben corresponder a evidencias reales.</p>
  </section>;
}
