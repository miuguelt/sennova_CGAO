import React from 'react';
import Badge from './Badge';

const STATUS_MAP = {
  'Formulación':    { variant: 'warning' },
  'Enviado':        { variant: 'info' },
  'Aprobado':       { variant: 'success' },
  'En ejecución':   { variant: 'primary' },
  'Finalizado':     { variant: 'success' },
  'Rechazado':      { variant: 'danger' },
  'actualizado':    { variant: 'success' },
  'Actualizado':    { variant: 'success' },
  'desactualizado': { variant: 'warning' },
  'Desactualizado': { variant: 'warning' },
  'sin CVLAC':      { variant: 'danger' },
  'Sin CVLAC':      { variant: 'danger' },
  'No actualizado': { variant: 'danger' },
  'activo':         { variant: 'success' },
  'Activo':         { variant: 'success' },
  'inactivo':       { variant: 'default' },
  'Inactivo':       { variant: 'default' },
  'abierta':        { variant: 'success' },
  'Abierta':        { variant: 'success' },
  'cerrada':        { variant: 'default' },
  'Cerrada':        { variant: 'default' },
  'en_evaluacion':  { variant: 'warning' },
  'En Evaluación':  { variant: 'warning' },
  'en_desarrollo':  { variant: 'info' },
  'En Desarrollo':  { variant: 'info' },
  'en_revision':    { variant: 'warning' },
  'En Revisión':    { variant: 'warning' },
  'pendiente':      { variant: 'default' },
  'Pendiente':      { variant: 'default' },
};

const StatusBadge = ({ estado }) => {
  const { variant } = STATUS_MAP[estado] ?? { variant: 'default' };
  return <Badge variant={variant} dot>{estado}</Badge>;
};

export default StatusBadge;
