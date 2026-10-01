import { Chip } from '@mui/material';
import { label } from '@/utils/labels';

const CONFIG = {
  Disponible:    { color: 'success' },
  Prestado:      { color: 'warning' },
  Mantenimiento: { color: 'error' },
  'Dado de baja':{ color: 'default' },
};

export default function EquipoEstadoChip({ estado }) {
  const cfg = CONFIG[estado] ?? { color: 'default' };
  return <Chip label={label(estado) ?? '—'} color={cfg.color} size="small" />;
}
