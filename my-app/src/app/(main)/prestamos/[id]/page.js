'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Chip, Divider, CircularProgress,
  IconButton, Tooltip, Button,
} from '@mui/material';
import ArrowBackIcon          from '@mui/icons-material/ArrowBack';
import FileDownloadIcon       from '@mui/icons-material/FileDownload';
import CheckIcon              from '@mui/icons-material/Check';
import DrawIcon               from '@mui/icons-material/Draw';
import LaptopIcon             from '@mui/icons-material/Laptop';
import PersonIcon             from '@mui/icons-material/Person';
import CalendarTodayIcon      from '@mui/icons-material/CalendarToday';
import PowerIcon              from '@mui/icons-material/Power';
import OpenInNewIcon          from '@mui/icons-material/OpenInNew';
import { api }                from '@/services/api';
import { formatDate, formatGB } from '@/utils/formatDate';
import { useToast }           from '@/contexts/ToastContext';
import { label }              from '@/utils/labels';

function Section({ title, icon, children }) {
  return (
    <Paper sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
      <Box sx={{
        px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: 1.5, flexShrink: 0,
          bgcolor: 'rgba(17,118,239,0.08)', border: '1px solid rgba(17,118,239,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
      </Box>
      <Box sx={{ px: 3, py: 2.5 }}>{children}</Box>
    </Paper>
  );
}

function Field({ label, value, mono }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.68rem' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: value ? 'text.primary' : 'text.disabled', mt: 0.3,
          ...(mono && { fontFamily: 'monospace', fontSize: '0.85rem' }),
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

export default function PrestamoDetailPage() {
  const { id }        = useParams();
  const router        = useRouter();
  const { showToast } = useToast();

  const [prestamo, setPrestamo]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/prestamos/${id}`)
      .then(setPrestamo)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDescargarPDF() {
    setDownloading(true);
    try {
      const blob = await api.get(`/prestamos/${id}/pdf`);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const nombre = (prestamo.nombre_empleado || 'Employee').replace(/\s+/g, '_');
      const codigo = prestamo.equipo?.codigo_interno || id;
      a.download = `${nombre}_${codigo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Could not generate the PDF', 'error');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !prestamo) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="error">{error || 'Loan not found'}</Typography>
        <Button sx={{ mt: 2 }} onClick={() => router.back()}>Back</Button>
      </Box>
    );
  }

  const firmado  = prestamo.estado_firma === 'completo';
  const cerrado  = prestamo.estado_prestamo === 'Cerrado';
  const accs     = Array.isArray(prestamo.accesorios) ? prestamo.accesorios : [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Tooltip title="Back" arrow>
          <IconButton size="small" onClick={() => router.back()} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            Loan #{prestamo.id}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {prestamo.nombre_empleado}
            {prestamo.creado_por && (
              <> · registered by <strong>{prestamo.creado_por.nombre}</strong></>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={label(prestamo.estado_prestamo)}
            size="small"
            color={cerrado ? 'default' : 'warning'}
          />
          {firmado ? (
            <Chip icon={<CheckIcon sx={{ fontSize: '12px !important' }} />} label="Signed" size="small" color="success" />
          ) : (
            <Chip icon={<DrawIcon sx={{ fontSize: '12px !important' }} />} label="Signature pending" size="small" color="warning" />
          )}
          {firmado && (
            <Tooltip title="Download PDF receipt" arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={handleDescargarPDF}
                  disabled={downloading}
                  sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}
                >
                  {downloading
                    ? <CircularProgress size={16} sx={{ color: '#1176EF' }} />
                    : <FileDownloadIcon fontSize="small" />
                  }
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Empleado */}
      <Section title="Recipient details" icon={<PersonIcon sx={{ fontSize: 14, color: 'primary.main' }} />}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <Field label="Name"    value={prestamo.nombre_empleado} />
          <Field label="Job title"value={prestamo.cargo_empleado} />
          <Field label="Email"   value={prestamo.correo_empleado} />
        </Box>
      </Section>

      {/* Equipo */}
      <Section title="Assigned device" icon={<LaptopIcon sx={{ fontSize: 14, color: 'primary.main' }} />}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <Field label="Internal code"  value={prestamo.equipo?.codigo_interno} mono />
          <Field label="Brand / Model"  value={`${prestamo.equipo?.marca || ''} ${prestamo.equipo?.modelo || ''}`} />
          <Field label="Type"           value={label(prestamo.equipo?.tipo)} />
          <Field label="Processor"      value={prestamo.equipo?.procesador} />
          <Field label="RAM"            value={formatGB(prestamo.equipo?.ram)} />
          <Field label="Storage"        value={formatGB(prestamo.equipo?.almacenamiento)} />
        </Box>
        {prestamo.equipo?.id && (
          <Box sx={{ mt: 2 }}>
            <Button
              size="small"
              variant="outlined"
              endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              onClick={() => router.push(`/inventario/${prestamo.equipo.id}`)}
              sx={{ fontSize: '0.78rem', py: 0.5 }}
            >
              View device details
            </Button>
          </Box>
        )}
      </Section>

      {/* Accesorios */}
      <Section title="Accessories handed over" icon={<PowerIcon sx={{ fontSize: 14, color: 'primary.main' }} />}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <Chip
            label={prestamo.cargador_entregado ? 'Charger ✓' : 'No charger'}
            size="small"
            color={prestamo.cargador_entregado ? 'success' : 'default'}
          />
          {accs.map((a) => (
            <Chip key={a} label={a} size="small" variant="outlined" />
          ))}
        </Box>
        {accs.length === 0 && !prestamo.cargador_entregado && (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>No additional accessories</Typography>
        )}
      </Section>

      {/* Fechas */}
      <Section title="Dates" icon={<CalendarTodayIcon sx={{ fontSize: 14, color: 'primary.main' }} />}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <Field label="Hand-over date"             value={formatDate(prestamo.fecha_entrega)} />
          <Field label="Expected return"            value={formatDate(prestamo.fecha_devolucion_estimada)} />
          {cerrado && <Field label="Actual return" value={formatDate(prestamo.fecha_devolucion_real)} />}
        </Box>
        {prestamo.observaciones_entrega && (
          <>
            <Divider sx={{ my: 2 }} />
            <Field label="Hand-over notes" value={prestamo.observaciones_entrega} />
          </>
        )}
      </Section>

      {/* Devolución (solo si cerrado) */}
      {cerrado && (
        <Paper sx={{ borderRadius: 2, mb: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700}>Return</Typography>
          </Box>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
              <Field label="Device condition" value={label(prestamo.estado_equipo_devolucion)} />
            </Box>
            {prestamo.observaciones_devolucion && (
              <>
                <Divider sx={{ my: 2 }} />
                <Field label="Return notes" value={prestamo.observaciones_devolucion} />
              </>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
