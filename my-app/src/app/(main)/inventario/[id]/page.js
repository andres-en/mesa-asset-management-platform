'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Chip, Divider, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Button,
} from '@mui/material';
import ArrowBackIcon         from '@mui/icons-material/ArrowBack';
import EditIcon              from '@mui/icons-material/Edit';
import CheckIcon             from '@mui/icons-material/Check';
import DrawIcon              from '@mui/icons-material/Draw';
import SwapHorizIcon         from '@mui/icons-material/SwapHoriz';
import { api }               from '@/services/api';
import { formatDate, formatGB } from '@/utils/formatDate';
import { label }             from '@/utils/labels';
import EquipoEstadoChip      from '@/components/equipos/EquipoEstadoChip';
import EquipoForm            from '@/components/equipos/EquipoForm';
import { useToast }          from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

function Field({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.68rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: value ? 'text.primary' : 'text.disabled', mt: 0.3 }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

const ESTADO_COLOR = {
  completo:         'success',
  pendiente_remota: 'warning',
};

export default function EquipoDetailPage() {
  const { id }      = useParams();
  const router      = useRouter();
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const [equipo, setEquipo]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    try {
      const data = await api.get(`/equipos/${id}`);
      setEquipo(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !equipo) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="error">{error || 'Device not found'}</Typography>
        <Button sx={{ mt: 2 }} onClick={() => router.back()}>Back</Button>
      </Box>
    );
  }

  const prestamos  = equipo.prestamos  || [];
  const historial  = equipo.historial  || [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Tooltip title="Back to inventory" arrow>
          <IconButton size="small" onClick={() => router.push('/inventario')} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {equipo.codigo_interno}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {equipo.marca} {equipo.modelo}
          </Typography>
        </Box>
        <EquipoEstadoChip estado={equipo.estado} />
        {isAdmin && (
        <Tooltip title="Edit device" arrow>
          <IconButton
            size="small"
            onClick={() => setEditOpen(true)}
            sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        )}
      </Box>

      {/* Ficha técnica */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
          Specifications
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
          <Field label="Type"            value={label(equipo.tipo)} />
          <Field label="Brand"           value={equipo.marca} />
          <Field label="Model"           value={equipo.modelo} />
          <Field label="Internal code"   value={equipo.codigo_interno} />
          <Field label="Processor"       value={equipo.procesador} />
          <Field label="RAM"             value={formatGB(equipo.ram)} />
          <Field label="Storage"         value={formatGB(equipo.almacenamiento)} />
        </Box>
        {equipo.observaciones && (
          <>
            <Divider sx={{ my: 2 }} />
            <Field label="Notes" value={equipo.observaciones} />
          </>
        )}
      </Paper>

      {/* Historial de préstamos */}
      <Paper sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Loans ({prestamos.length})
          </Typography>
        </Box>
        {prestamos.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>No loans recorded</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Job title</TableCell>
                  <TableCell>Handed over</TableCell>
                  <TableCell>Return</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Signature</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prestamos.map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/prestamos/${p.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{p.nombre_empleado}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{p.correo_empleado}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{p.cargo_empleado || '—'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{formatDate(p.fecha_entrega)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                      {formatDate(p.fecha_devolucion_real) || formatDate(p.fecha_devolucion_estimada) || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={label(p.estado_prestamo)}
                        size="small"
                        color={p.estado_prestamo === 'Activo' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {p.estado_firma === 'completo' ? (
                        <Chip icon={<CheckIcon sx={{ fontSize: '12px !important' }} />} label="Signed" size="small" color="success" />
                      ) : (
                        <Chip icon={<DrawIcon sx={{ fontSize: '12px !important' }} />} label="Pending" size="small" color="warning" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Historial de estados */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Status history ({historial.length})
          </Typography>
        </Box>
        {historial.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>No changes recorded</Typography>
          </Box>
        ) : (
          <Box sx={{ px: 3, py: 2 }}>
            {historial.map((h, i) => (
              <Box key={h.id}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5 }}>
                  <Box sx={{
                    mt: 0.5, width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    bgcolor: 'rgba(17,118,239,0.08)', border: '1px solid rgba(17,118,239,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <SwapHorizIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {h.estado_anterior && (
                        <>
                          <Chip label={label(h.estado_anterior)} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>→</Typography>
                        </>
                      )}
                      <Chip label={label(h.estado_nuevo)} size="small" color="primary" sx={{ fontSize: '0.7rem' }} />
                    </Box>
                    {h.observacion && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                        {h.observacion}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.3, display: 'block' }}>
                      {h.usuario_nombre && `${h.usuario_nombre} · `}{formatDate(h.fecha)}
                    </Typography>
                  </Box>
                </Box>
                {i < historial.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <EquipoForm
        open={editOpen}
        equipo={equipo}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          load();
          showToast('Device updated successfully', 'success');
        }}
      />
    </Box>
  );
}
