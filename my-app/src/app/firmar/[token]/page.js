'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box, Typography, Paper, Divider, Chip,
  Button, CircularProgress,
} from '@mui/material';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import ScheduleIcon     from '@mui/icons-material/Schedule';
import LaptopIcon  from '@mui/icons-material/Laptop';
import PersonIcon  from '@mui/icons-material/Person';
import FirmaCanvas from '@/components/firmas/FirmaCanvas';
import MesaLogo from '@/components/brand/MesaLogo';
import { BASE_URL } from '@/services/api';

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function InfoRow({ label, value, sx }) {
  return (
    <Box sx={sx}>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} sx={{ color: 'text.primary' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

function Section({ icon: Icon, iconColor = 'primary.main', iconBg = 'rgba(17,118,239,0.1)', iconBorder = 'rgba(17,118,239,0.2)', title, children }) {
  return (
    <Paper sx={{ mb: 2.5, borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'action.hover' }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: 1.5, flexShrink: 0,
          bgcolor: iconBg, border: '1px solid', borderColor: iconBorder,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 15, color: iconColor }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary' }}>
          {title}
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ p: 2.5 }}>
        {children}
      </Box>
    </Paper>
  );
}

const FULLSCREEN_COLORS = {
  success: { ring: 'rgba(74,222,128,0.18)',  border: 'rgba(74,222,128,0.35)',  glow: 'rgba(74,222,128,0.10)'  },
  warning: { ring: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.30)',  glow: 'rgba(251,191,36,0.08)'  },
  error:   { ring: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.30)', glow: 'rgba(248,113,113,0.08)' },
};

function FullScreen({ icon, color, title, message }) {
  const c = FULLSCREEN_COLORS[color] ?? FULLSCREEN_COLORS.error;
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 70% 50% at 50% 40%, ${c.glow} 0%, transparent 65%)` }} />
      <Box sx={{ position: 'relative', textAlign: 'center', maxWidth: 440 }}>
        <Box sx={{
          width: 76, height: 76, borderRadius: '50%', mx: 'auto', mb: 3,
          bgcolor: c.ring, border: `1.5px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 32px ${c.ring}`,
        }}>
          {icon}
        </Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: 'text.primary', letterSpacing: '-0.01em' }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.75, maxWidth: 360, mx: 'auto' }}>{message}</Typography>
        <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <MesaLogo height={28} />
        </Box>
      </Box>
    </Box>
  );
}

export default function FirmaPublicaPage() {
  const { token } = useParams();
  const [prestamo,      setPrestamo]      = useState(null);
  const [loadingPage,   setLoadingPage]   = useState(true);
  const [pageError,     setPageError]     = useState(null);
  const [firmaEmpleado, setFirmaEmpleado] = useState(null);
  const [enviando,      setEnviando]      = useState(false);
  const [completado,    setCompletado]    = useState(false);
  const [submitError,   setSubmitError]   = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/firma/${token}`)
      .then((res) => {
        if (!res.ok) {
          return res.json()
            .catch(() => ({}))
            .then((b) => {
              const msg = b.error || b.message || String(res.status);
              // 410 Gone = the link existed but expired (see firma_service.validar_token_firma).
              return Promise.reject(res.status === 410 ? 'expirado' : msg);
            });
        }
        return res.json();
      })
      .then((data) => {
        // estado_firma: 'pendiente_remota' → mostrar formulario
        // estado_firma: 'completo' → ya fue firmado
        // undefined → asumir pendiente (backend antiguo compatible)
        const estado = data.estado_firma;
        if (estado && estado !== 'pendiente_remota') {
          setPageError(estado);
        } else {
          setPrestamo(data);
        }
      })
      .catch((errorMsg) => {
        const msg = typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || 'not_found');
        setPageError(msg);
      })
      .finally(() => setLoadingPage(false));
  }, [token]);

  async function handleSubmit() {
    if (!firmaEmpleado) { setSubmitError('Please draw your signature before continuing.'); return; }
    setEnviando(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${BASE_URL}/firma/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ firma_empleado: firmaEmpleado }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || b.message || 'Could not save the signature');
      }
      setCompletado(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (loadingPage) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (completado || pageError === 'completo') {
    return (
      <FullScreen
        icon={<CheckCircleIcon sx={{ fontSize: 34, color: 'rgba(74,222,128,0.85)' }} />}
        color="success"
        title="Document signed"
        message="Your signature was recorded successfully. The IT team now has the signed loan receipt."
      />
    );
  }

  if (pageError === 'expirado') {
    return (
      <FullScreen
        icon={<ScheduleIcon sx={{ fontSize: 34, color: 'rgba(251,191,36,0.85)' }} />}
        color="warning"
        title="Link expired"
        message="This signature link has expired. Please contact the IT team so they can send you a new one."
      />
    );
  }

  if (pageError && !prestamo) {
    return (
      <FullScreen
        icon={<ErrorOutlineIcon sx={{ fontSize: 34, color: 'rgba(248,113,113,0.85)' }} />}
        color="error"
        title="Invalid link"
        message="This signature link does not exist or is not valid. Please contact the IT team."
      />
    );
  }

  // Si no hay prestamo y no hay error, algo salió mal — protección final
  if (!prestamo) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  const {
    equipo, nombre_empleado, cargo_empleado, correo_empleado,
    cargador_entregado, accesorios, fecha_entrega, fecha_devolucion_estimada,
    observaciones_entrega, token_expira_at,
  } = prestamo;

  const accs = Array.isArray(accesorios) ? accesorios : [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>

      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(17,118,239,0.13) 0%, transparent 55%)',
      }} />
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '35%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(16,160,232,0.05) 0%, transparent 65%)',
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 720, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <MesaLogo height={40} />
          <Chip
            icon={<ScheduleIcon sx={{ fontSize: '14px !important' }} />}
            label="Awaiting your signature"
            color="warning"
            size="small"
          />
        </Box>

        <Paper sx={{ mb: 2.5, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ height: 4, background: 'linear-gradient(90deg, #1176EF 0%, #4C9BF5 50%, #10A0E8 100%)' }} />
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
              Equipment Loan Receipt
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              Review the details and sign the document to confirm you received the device.
            </Typography>
          </Box>
        </Paper>

        <Section icon={LaptopIcon} title="Device handed over">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <InfoRow label="Internal code" value={equipo?.codigo_interno} />
            <InfoRow label="Brand / Model"  value={equipo ? `${equipo.marca} ${equipo.modelo}` : '—'} />
            <InfoRow label="Hand-over date"      value={formatFecha(fecha_entrega)} />
            <InfoRow label="Expected return"     value={formatFecha(fecha_devolucion_estimada)} />
            <InfoRow
              label="Charger handed over"
              value={cargador_entregado ? '✓ Yes' : '✗ No'}
            />
            {accs.length > 0 && (
              <InfoRow
                label="Accessories handed over"
                value={accs.join(', ')}
                sx={{ gridColumn: { sm: 'span 2' } }}
              />
            )}
            {observaciones_entrega && (
              <InfoRow label="Notes" value={observaciones_entrega} sx={{ gridColumn: { sm: 'span 2' } }} />
            )}
          </Box>
        </Section>

        <Section
          icon={PersonIcon}
          title="Recipient details"
          iconColor="secondary.main"
          iconBg="rgba(16,160,232,0.08)"
          iconBorder="rgba(16,160,232,0.2)"
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <InfoRow label="Name" value={nombre_empleado} />
            <InfoRow label="Job title"value={cargo_empleado} />
            <InfoRow label="Email" value={correo_empleado} sx={{ gridColumn: { sm: 'span 2' } }} />
          </Box>
        </Section>

        <Paper sx={{ mb: 2.5, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'action.hover' }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: 1.5,
              bgcolor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircleIcon sx={{ fontSize: 15, color: 'success.main' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>Signatures</Typography>
          </Box>
          <Divider />
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 1,
                border: '1px solid', borderColor: 'success.main', borderRadius: 2, p: 2, minHeight: 90 }}>
                <CheckCircleIcon sx={{ fontSize: 28, color: 'success.main' }} />
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>Signed by IT</Typography>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

              <Box sx={{ flex: 1 }}>
                <FirmaCanvas label="Your signature" value={firmaEmpleado} onChange={setFirmaEmpleado} />
              </Box>
            </Box>
          </Box>
        </Paper>

        {token_expira_at && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Link valid until {formatFecha(token_expira_at)}
            </Typography>
          </Box>
        )}

        {submitError && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Typography variant="caption" color="error">{submitError}</Typography>
          </Box>
        )}

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleSubmit}
          disabled={enviando || !firmaEmpleado}
          sx={{ borderRadius: 2.5, py: 1.5, fontSize: '1rem' }}
        >
          {enviando
            ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1.5 }} />Sending…</>
            : 'Confirm and sign receipt'
          }
        </Button>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'text.disabled' }}>
          By signing you confirm you received the device in the condition described above.
        </Typography>
      </Box>
    </Box>
  );
}
