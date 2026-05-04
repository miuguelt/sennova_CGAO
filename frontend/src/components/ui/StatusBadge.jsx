import React from 'react';
import Badge from './Badge';

const STATUS_MAP = {
  'Formulación':  { variant: 'warning' },
  'Enviado':      { variant: 'info' },
  'Aprobado':     { variant: 'success' },
  'En ejecución': { variant: 'primary' },
  'Finalizado':   { variant: 'success' },
  'Rechazado':    { variant: 'danger' },
  'actualizado':  { variant: 'success' },
  'desactualizado':{ variant: 'warning' },
  'sin CVLAC':    { variant: 'danger' },
  'activo':       { variant: 'success' },
  'inactivo':     { variant: 'danger' },
};

const StatusBadge = ({ estado }) => {
  const { variant } = STATUS_MAP[estado] ?? { variant: 'default' };
  return <Badge variant={variant} dot>{estado}</Badge>;
};

export default StatusBadge;
