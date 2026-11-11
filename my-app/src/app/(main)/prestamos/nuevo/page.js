'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, TextField, Button, Typography, Divider,
  FormControlLabel, Checkbox, CircularProgress,
  Autocomplete, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Chip,
  RadioGroup, Radio, InputAdornment, IconButton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { api } from '@/services/api';
import AppAlert from '@/components/ui/AppAlert';
import { todayISO } from '@/utils/formatDate';
import FirmaCanvas from '@/components/firmas/FirmaCanvas';
import PageHeader from '@/components/ui/PageHeader';
import DateField from '@/components/ui/DateField';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

const ACCESORIOS_COMUNES = [
  'Mouse', 'Keyboard', 'Webcam', 'Headphones',
  'HDMI cable', 'Adapter', 'Laptop bag / Sleeve', 'USB drive',
  'Mouse pad', 'USB hub',
];

const FORM_INICIAL = {
  equipo_id: null,
  nombre_empleado: '',
  cargo_empleado: '',
  correo_empleado: '',
  cargador_entregado: false,
  accesorios: [],
  fecha_entrega: todayISO(),
  fecha_devolucion_estimada: '',
  observaciones_entrega: '',
};

export default function NuevoPrestamoPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <>
        <PageHeader title="New loan" />
        <AppAlert severity="info">Your role is read-only. Ask an administrator to register loans.</AppAlert>
      </>
    );
  }
  return <NuevoPrestamoForm />;
}

function NuevoPrestamoForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [firmaIT, setFirmaIT] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(true);
  const [error, setError] = useState(null);
  const [enviarEmail, setEnviarEmail] = useState('si');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    api.get('/equipos')
      // Solo equipos de bodega: los asignados a un puesto de oficina están en uso fijo y no se prestan.
      .then((data) => setEquiposDisponibles(data.filter((e) => e.estado === 'Disponible' && !e.oficina_id)))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingEquipos(false));
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function toggleAccesorio(acc) {
    setForm((prev) => ({
      ...prev,
      accesorios: prev.accesorios.includes(acc)
        ? prev.accesorios.filter((a) => a !== acc)
        : [...prev.accesorios, acc],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.equipo_id) { setError('Please select a device.'); return; }
    if (!firmaIT)        { setError('The IT staff signature is required.'); return; }

    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/prestamos', {
        ...form,
        equipo_id: form.equipo_id.id,
        firma_it: firmaIT,
        firma_remota: true,
        enviar_email: enviarEmail === 'si',
      });
      setResultado(data);
      showToast('Loan registered successfully', 'success');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function copiarLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copied to clipboard', 'success');
    } catch {
      showToast('Could not copy the link', 'error');
    }
  }

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <PageHeader title="New loan" />

        <AppAlert show={Boolean(error)} sx={{ mb: 3 }}>{error}</AppAlert>

        {/* Sección: Equipo */}
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Device
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Autocomplete
              options={equiposDisponibles}
              loading={loadingEquipos}
              getOptionLabel={(e) => `${e.codigo_interno} — ${e.marca} ${e.modelo}`}
              value={form.equipo_id}
              onChange={(_, val) => setForm((prev) => ({ ...prev, equipo_id: val }))}
              renderInput={(params) => (
                <TextField {...params} label="Available device" required />
              )}
              sx={{ gridColumn: { sm: 'span 2' } }}
            />
          </Box>
        </Paper>

        {/* Sección: Empleado */}
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Employee details
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Full name"
              name="nombre_empleado"
              value={form.nombre_empleado}
              onChange={handleChange}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 150 } }}
            />
            <TextField
              label="Job title"
              name="cargo_empleado"
              value={form.cargo_empleado}
              onChange={handleChange}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="Work email"
              name="correo_empleado"
              type="email"
              value={form.correo_empleado}
              onChange={handleChange}
              required
              fullWidth
              sx={{ gridColumn: { sm: 'span 2' } }}
              slotProps={{ htmlInput: { maxLength: 254 } }}
            />
          </Box>
        </Paper>

        {/* Sección: Accesorios */}
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
            Accessories handed over
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select what is handed over with the device. You can also type custom accessories.
          </Typography>

          {/* Checkboxes rápidos */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {ACCESORIOS_COMUNES.map((acc) => {
              const selected = form.accesorios.includes(acc);
              return (
                <Chip
                  key={acc}
                  label={acc}
                  clickable
                  onClick={() => toggleAccesorio(acc)}
                  variant={selected ? 'filled' : 'outlined'}
                  color={selected ? 'primary' : 'default'}
                  size="small"
                  sx={{ fontWeight: selected ? 600 : 400 }}
                />
              );
            })}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Autocomplete libre para accesorios personalizados */}
          <Autocomplete
            multiple
            freeSolo
            options={ACCESORIOS_COMUNES.filter((a) => !form.accesorios.includes(a))}
            value={form.accesorios}
            onChange={(_, val) => setForm((prev) => ({ ...prev, accesorios: val }))}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Add a custom accessory"
                placeholder="Type and press Enter"
              />
            )}
          />

          <Divider sx={{ my: 2 }} />

          {/* Cargador (separado, ya existía) */}
          <FormControlLabel
            control={
              <Checkbox
                name="cargador_entregado"
                checked={form.cargador_entregado}
                onChange={handleChange}
              />
            }
            label="Charger / power supply handed over"
          />
        </Paper>

        {/* Sección: Fechas */}
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Dates and notes
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <DateField
              label="Hand-over date"
              value={form.fecha_entrega}
              onChange={(v) => setForm((p) => ({ ...p, fecha_entrega: v }))}
              required
            />
            <DateField
              label="Expected return date"
              value={form.fecha_devolucion_estimada}
              onChange={(v) => setForm((p) => ({ ...p, fecha_devolucion_estimada: v }))}
              required
            />
            <TextField
              label="Notes"
              name="observaciones_entrega"
              value={form.observaciones_entrega}
              onChange={handleChange}
              multiline
              rows={3}
              fullWidth
              sx={{ gridColumn: { sm: 'span 2' } }}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
          </Box>
        </Paper>

        {/* Sección: Firma IT */}
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            IT staff signature
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The recipient signs later through the link generated when you save.
          </Typography>
          <FirmaCanvas
            label="Your signature (IT)"
            value={firmaIT}
            onChange={setFirmaIT}
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            How do you want to share the signature link?
          </Typography>
          <RadioGroup
            row
            value={enviarEmail}
            onChange={(e) => setEnviarEmail(e.target.value)}
          >
            <FormControlLabel value="si" control={<Radio />} label="Email it to the employee" />
            <FormControlLabel value="no" control={<Radio />} label="Only generate the link (I will share it)" />
          </RadioGroup>
        </Paper>

        {/* Acciones */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/prestamos/activos')} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading} size="large">
            {loading
              ? <CircularProgress size={22} color="inherit" />
              : enviarEmail === 'si' ? 'Save and send by email' : 'Save and generate link'}
          </Button>
        </Box>
      </Box>

      {/* Dialog con el resultado */}
      <Dialog open={Boolean(resultado)} maxWidth="xs" fullWidth>
        <DialogTitle>Loan saved</DialogTitle>
        <DialogContent>
          {enviarEmail === 'si' ? (
            <Alert severity="success">
              An email with the signature link was sent to <strong>{form.correo_empleado}</strong>.
            </Alert>
          ) : (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Copy this link and share it with the employee (chat, WhatsApp, etc.) so they can sign the hand-over receipt.
              </Alert>
              <TextField
                fullWidth
                size="small"
                value={resultado?.link_firma || ''}
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => copiarLink(resultado?.link_firma)} edge="end" size="small">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => router.push('/prestamos/activos')} variant="contained">
            Go to active loans
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
