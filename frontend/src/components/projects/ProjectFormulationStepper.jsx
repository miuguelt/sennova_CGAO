import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const SHORT_TITLES = {
  identificacion: 'Identificación',
  institucional: 'Institucional',
  problema: 'Problema',
  objetivos: 'Objetivos',
  marco: 'Marco',
  metodologia: 'Metodología',
  resultados: 'Resultados',
  recursos: 'Recursos',
  referencias: 'Referencias',
  generar: 'Generación',
};

export default function ProjectFormulationStepper({ steps = [], activeStepId, onSelectStep, className = '' }) {
  if (!steps?.length) return null;

  return (
    <nav
      role="navigation"
      aria-label="Etapas de formulación"
      className={`formulation-stepper w-full overflow-x-auto py-2.5 px-3 bg-slate-50/80 border border-slate-200/90 rounded-2xl ${className}`}
    >
      <ol className="flex items-center gap-2 min-w-max text-xs">
        {steps.map((step, index) => {
          const stepNumber = step.numero || index + 1;
          const isActive = step.id === activeStepId;
          const isComplete = !!step.completo;
          const shortTitle = SHORT_TITLES[step.id] || step.titulo;

          let badgeClasses = 'text-slate-600 bg-white border-slate-300 hover:border-slate-400';
          if (isActive) {
            badgeClasses = 'ring-2 ring-emerald-700 bg-emerald-100 text-emerald-950 font-bold border-emerald-400';
          } else if (isComplete) {
            badgeClasses = 'text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60';
          }

          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Paso ${stepNumber}: ${step.titulo}`}
                onClick={() => onSelectStep?.(step.id)}
                title={`Paso ${stepNumber}: ${step.titulo}`}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${badgeClasses}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold shrink-0 ${
                    isActive
                      ? 'bg-emerald-700 text-white'
                      : isComplete
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  aria-hidden="true"
                >
                  {isComplete && !isActive ? (
                    <CheckCircle2 size={13} className="text-emerald-700" />
                  ) : (
                    stepNumber
                  )}
                </span>
                <span className="truncate max-w-[120px] font-medium leading-tight">
                  {stepNumber}. {shortTitle}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`w-3 h-0.5 mx-1 shrink-0 ${
                    isComplete ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
