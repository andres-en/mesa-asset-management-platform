/**
 * Display labels for the enum values the API stores and validates in Spanish
 * (equipment status, loan status, return condition, equipment type...).
 * The values themselves are part of the API contract and must be sent back
 * unchanged; only what the user sees goes through `label()`.
 */
const LABELS = {
  // UI-only filter option
  Todos: 'All',
  // Equipment status (ESTADOS_EQUIPO)
  Disponible: 'Available',
  Prestado: 'On loan',
  Mantenimiento: 'Maintenance',
  'Dado de baja': 'Retired',
  // Loan status (ESTADOS_PRESTAMO)
  Activo: 'Active',
  Cerrado: 'Closed',
  // Signature status (ESTADOS_FIRMA)
  completo: 'Signed',
  pendiente_remota: 'Pending remote signature',
  // Condition on return (ESTADOS_EQUIPO_DEVOLUCION)
  Bueno: 'Good',
  'Con daños': 'Damaged',
  Incompleto: 'Incomplete',
  'Requiere mantenimiento': 'Needs maintenance',
  // Remote command execution status (ESTADOS_COMANDO_EJECUCION)
  pendiente: 'Pending',
  en_progreso: 'In progress',
  completado: 'Completed',
  fallido: 'Failed',
  // Equipment types
  Servidor: 'Server',
  Impresora: 'Printer',
  Otro: 'Other',
};

export function label(value) {
  if (value === null || value === undefined || value === '') return value;
  return LABELS[value] ?? value;
}
