'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Button, Chip, CircularProgress,
  Tooltip, IconButton, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, TextField, InputAdornment,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckIcon from '@mui/icons-material/Check';
import DrawIcon from '@mui/icons-material/Draw';
import RefreshIcon2 from '@mui/icons-material/Autorenew';
import NotesIcon from '@mui/icons-material/Notes';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { usePrestamos } from '@/hooks/usePrestamos';
import { formatDate } from '@/utils/formatDate';
import AppAlert from '@/components/ui/AppAlert';
import DevolucionModal from '@/components/prestamos/DevolucionModal';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

function parseAccesorios(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

export default function PrestamosActivosPage() {
  const { prestamos, loading, error, refetch } = usePrestamos('/prestamos?estado=Activo');
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [regenerandoId, setRegenerandoId] = useState(null);
  const [generandoLinkId, setGenerandoLinkId] = useState(null);
  const [linkGenerado, setLinkGenerado] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const { showToast } = useToast();
  const router = useRouter();
  const { isAdmin } = useAuth();

  function esExpirado(p) {
    if (p.estado_firma === 'pendiente_remota' && p.token_expira_at) {
      return new Date() > new Date(p.token_expira_at);
    }
    return false;
  }

  async function handleReenviarFirma(p) {
    setRegenerandoId(p.id);
    try {
      await import('@/services/api').then(m => m.api.post(`/prestamos/${p.id}/reenviar-firma`));
      refetch();
      showToast('Signature email re-sent successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRegenerandoId(null);
    }
  }

  async function handleGenerarLink(p) {
    setGenerandoLinkId(p.id);
    try {
      const data = await import('@/services/api').then(m =>
        m.api.post(`/prestamos/${p.id}/reenviar-firma`, { enviar_email: false })
      );
      refetch();
      setLinkGenerado(data.link);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setGenerandoLinkId(null);
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
    <Box>
      <PageHeader
        title="Active loans"
        subtitle="Devices currently in use by employees"
        actionLabel={isAdmin ? "New loan" : undefined}
        onAction={() => router.push('/prestamos/nuevo')}
      />

      <AppAlert show={Boolean(error)} sx={{ mb: 3 }}>Could not connect to the server</AppAlert>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {prestamos.length} active loan{prestamos.length !== 1 ? 's' : ''}
        </Typography>
        <Tooltip title="Refresh" arrow>
          <IconButton size="small" onClick={refetch} sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Job title</TableCell>
                <TableCell>Charger</TableCell>
                <TableCell>Accessories</TableCell>
                <TableCell>Handed over</TableCell>
                <TableCell>Expected return</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Signature</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, border: 'none' }}>
                    <CircularProgress size={26} sx={{ color: '#1176EF' }} />
                  </TableCell>
                </TableRow>
              ) : prestamos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, border: 'none', color: 'text.secondary' }}>
                    No active loans
                  </TableCell>
                </TableRow>
              ) : (
                prestamos.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => {
                  const expirado = esExpirado(p);
                  return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'primary.main', fontFamily: 'monospace' }}>
                        {p.equipo?.codigo_interno}
                      </Typography>
                      <Typography sx={{ fontSize: '0.775rem', color: 'text.secondary' }}>
                        {p.equipo?.marca} / {p.equipo?.modelo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.875rem' }}>
                        {p.nombre_empleado}
                      </Typography>
                      {p.correo_empleado && (
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {p.correo_empleado}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{p.cargo_empleado}</TableCell>
                    <TableCell>
                      <Chip
                        label={p.cargador_entregado ? 'Yes' : 'No'}
                        size="small"
                        color={p.cargador_entregado ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      {(() => { const accs = parseAccesorios(p.accesorios); return accs.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {accs.slice(0, 3).map((a) => (
                            <Chip key={a} label={a} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                          ))}
                          {accs.length > 3 && (
                            <Tooltip title={accs.slice(3).join(', ')} arrow>
                              <Chip label={`+${accs.length - 3}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                            </Tooltip>
                          )}
                        </Box>
                      ) : <Typography sx={{ color: 'text.disabled', fontSize: '0.825rem' }}>—</Typography>; })()}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{formatDate(p.fecha_entrega)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{formatDate(p.fecha_devolucion_estimada)}</TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      {p.observaciones_entrega ? (
                        <Tooltip title={p.observaciones_entrega} arrow placement="top">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                            <NotesIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                            <Typography
                              sx={{
                                fontSize: '0.78rem',
                                color: 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.observaciones_entrega}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography sx={{ color: 'text.disabled', fontSize: '0.825rem' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.estado_firma === 'completo' ? (
                        <Chip icon={<CheckIcon sx={{ fontSize: '13px !important' }} />} label="Signed" size="small" color="success" />
                      ) : expirado ? (
                        <Chip label="Expired" size="small" color="error" />
                      ) : (
                        <Chip icon={<DrawIcon sx={{ fontSize: '13px !important' }} />} label="Pending" size="small" color="warning" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        {isAdmin && p.estado_firma === 'pendiente_remota' && (
                          <Tooltip title={expirado ? 'Token expired — resend email' : 'Resend signature email'} arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleReenviarFirma(p)}
                              disabled={regenerandoId === p.id}
                              sx={{ color: expirado ? 'error.main' : 'warning.main', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}
                            >
                              {regenerandoId === p.id
                                ? <CircularProgress size={16} color="inherit" />
                                : <RefreshIcon2 sx={{ fontSize: 16 }} />
                              }
                            </IconButton>
                          </Tooltip>
                        )}
                        {isAdmin && p.estado_firma === 'pendiente_remota' && (
                          <Tooltip title="Generate / copy signature link" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleGenerarLink(p)}
                              disabled={generandoLinkId === p.id}
                              sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}
                            >
                              {generandoLinkId === p.id
                                ? <CircularProgress size={16} color="inherit" />
                                : <LinkIcon sx={{ fontSize: 16 }} />
                              }
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="View details" arrow>
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/prestamos/${p.id}`)}
                            sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                        <Tooltip title="Register return" arrow>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AssignmentTurnedInIcon sx={{ fontSize: '14px !important' }} />}
                            onClick={() => setPrestamoSeleccionado(p)}
                            sx={{
                              fontSize: '0.78rem',
                              py: 0.5,
                              px: 1.5,
                              borderColor: 'success.light',
                              color: 'success.main',
                              '&:hover': { borderColor: 'success.main', bgcolor: 'rgba(22,163,74,0.06)' },
                            }}
                          >
                            Return
                          </Button>
                        </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={prestamos.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
        />
      </Paper>

      <DevolucionModal
        open={Boolean(prestamoSeleccionado)}
        prestamo={prestamoSeleccionado}
        onClose={() => setPrestamoSeleccionado(null)}
        onDevuelto={() => { refetch(); showToast('Return registered successfully', 'success'); }}
      />

      <Dialog open={Boolean(linkGenerado)} onClose={() => setLinkGenerado(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Signature link</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            A new link was generated (the previous one is no longer valid). Share it with the employee via chat, WhatsApp, etc.
          </Alert>
          <TextField
            fullWidth
            size="small"
            value={linkGenerado || ''}
            slotProps={{
              input: {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => copiarLink(linkGenerado)} edge="end" size="small">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkGenerado(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
