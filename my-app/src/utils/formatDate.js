/**
 * Muestra un valor de RAM o almacenamiento con unidad "GB" si el valor
 * es solo un número (ej: "16" → "16 GB"). Si ya tiene unidad lo deja igual.
 */
export function formatGB(val) {
  if (!val) return '—';
  const s = String(val).trim();
  return /^\d+(\.\d+)?$/.test(s) ? `${s} GB` : s;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}
