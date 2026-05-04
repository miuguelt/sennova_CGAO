/**
 * Utilidad para combinar clases (Simplificada para debug)
 */
export function cn(...inputs) {
  return inputs.flat().filter(Boolean).join(' ');
}
