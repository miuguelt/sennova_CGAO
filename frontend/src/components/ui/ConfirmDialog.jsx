import React, { useState } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

const VARIANT_ICONS = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const VARIANT_BUTTONS = {
  danger: 'bg-rose-700 hover:bg-rose-800 text-white font-bold',
  warning: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border border-amber-600',
  info: 'bg-blue-700 hover:bg-blue-800 text-white font-bold',
  success: 'bg-emerald-700 hover:bg-emerald-800 text-white font-bold',
};

/**
 * Diálogo de Confirmación Estandarizado — SENNOVA CGAO
 * Se apila automáticamente sobre otros modales o paneles abiertos.
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar acción?',
  description = 'Esta operación no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  icon: CustomIcon,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const Icon = CustomIcon || VARIANT_ICONS[variant] || AlertTriangle;

  const handleConfirm = async () => {
    if (typeof onConfirm !== 'function') return;
    try {
      setSubmitting(true);
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loading || submitting;

  const footer = (
    <>
      <Button
        variant="outline"
        onClick={onClose}
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        {cancelText}
      </Button>
      <Button
        className={`w-full sm:w-auto ${VARIANT_BUTTONS[variant] || VARIANT_BUTTONS.danger}`}
        onClick={handleConfirm}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Procesando...
          </span>
        ) : (
          confirmText
        )}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      size="sm"
      variant={variant}
      title={title}
      icon={Icon}
      footer={footer}
      closeOnEsc={!isLoading}
      closeOnBackdrop={!isLoading}
    >
      <div className="text-sm text-slate-800 font-medium leading-relaxed space-y-2">
        {typeof description === 'string' ? <p>{description}</p> : description}
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
