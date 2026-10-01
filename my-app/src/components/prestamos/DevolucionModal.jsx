'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogActions,
  TextField, Button, Box, FormControl,
  InputLabel, Select, MenuItem, Typography, Divider,
} from '@mui/material';
import LaptopIcon   from '@mui/icons-material/Laptop';
import PersonIcon   from '@mui/icons-material/Person';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { api } from '@/services/api';
import { todayISO } from '@/utils/formatDate';
import DateField from '@/components/ui/DateField';
import { useToast } from '@/contexts/ToastContext';
import { label } from '@/utils/labels';

const ESTADOS_EQUIPO = ['Bueno', 'Con daños', 'Incompleto', 'Requiere mantenimiento'];

export default function DevolucionModal({ open, prestamo, onClose, onDevuelto }) {
  const [form, setForm] = useState({
    fecha_devolucion_real: todayISO(),
    estado_equipo_devolucion: 'Bueno',
    observaciones_devolucion: '',
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setForm({
        fecha_devolucion_real: todayISO(),
        estado_equipo_devolucion: 'Bueno',
        observaciones_devolucion: '',
      });
    }
  }, [open]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/prestamos/${prestamo.id}/devolver`, form);
      onDevuelto();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!prestamo) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* Header */}
      <Box sx={{
        px: 3, pt: 2.5, pb: 2,
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2, flexShrink: 0,
          background: 'linear-gradient(135deg, #1176EF 0%, #4C9BF5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AssignmentReturnIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>Register return</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Fill in the details to close the loan
          </Typography>
        </Box>
      </Box>

      <Divider />

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5 }}>

          {/* Tarjeta de resumen del préstamo */}
          <Box sx={{
            mb: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}>
            {/* Equipo */}
            <Box sx={{
              px: 2, py: 1.5,
              display: 'flex', alignItems: 'center', gap: 1.5,
              bgcolor: 'action.hover',
            }}>
              <Box sx={{
                width: 30, height: 30, borderRadius: 1.5, flexShrink: 0,
                bgcolor: 'rgba(17,118,239,0.1)',
                border: '1px solid rgba(17,118,239,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LaptopIcon sx={{ fontSize: 15, color: 'primary.main' }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
                  Device
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', lineHeight: 1.3 }}>
                  {prestamo.equipo?.codigo_interno}
                  <Typography component="span" variant="body2" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                    {' '}— {prestamo.equipo?.marca} {prestamo.equipo?.modelo}
                  </Typography>
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Empleado */}
            <Box sx={{
              px: 2, py: 1.5,
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Box sx={{
                width: 30, height: 30, borderRadius: 1.5, flexShrink: 0,
                bgcolor: 'rgba(16,160,232,0.08)',
                border: '1px solid rgba(16,160,232,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PersonIcon sx={{ fontSize: 15, color: 'secondary.main' }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
                  Employee
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', lineHeight: 1.3 }}>
                  {prestamo.nombre_empleado}
                  {prestamo.cargo_empleado && (
                    <Typography component="span" variant="body2" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                      {' '}· {prestamo.cargo_empleado}
                    </Typography>
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <DateField
              label="Return date"
              value={form.fecha_devolucion_real}
              onChange={(v) => setForm((p) => ({ ...p, fecha_devolucion_real: v }))}
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Device condition</InputLabel>
              <Select
                name="estado_equipo_devolucion"
                value={form.estado_equipo_devolucion}
                label="Device condition"
                onChange={handleChange}
              >
                {ESTADOS_EQUIPO.map((est) => (
                  <MenuItem key={est} value={est}>{label(est)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Notes"
              name="observaciones_devolucion"
              value={form.observaciones_devolucion}
              onChange={handleChange}
              multiline
              rows={3}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button type="button" variant="outlined" onClick={onClose} disabled={loading} size="small">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading} size="small" startIcon={<AssignmentReturnIcon />}>
            {loading ? 'Saving…' : 'Register return'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
