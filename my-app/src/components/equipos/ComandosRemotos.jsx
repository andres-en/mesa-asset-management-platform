'use client';

import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Divider, Button, MenuItem, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import KeyIcon from '@mui/icons-material/VpnKey';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CircleIcon from '@mui/icons-material/Circle';
import { api } from '@/services/api';
import { formatDate } from '@/utils/formatDate';
import { label } from '@/utils/labels';
import { useToast } from '@/contexts/ToastContext';

const ESTADO_COLOR = {
  pendiente: 'default',
  en_progreso: 'warning',
  completado: 'success',
  fallido: 'error',
};

export default function ComandosRemotos({ equipo, onEquipoChange }) {
  const { showToast } = useToast();

  const [catalogo, setCatalogo] = useState([]);
  const [ejecuciones, setEjecuciones] = useState([]);
  const [comandoSel, setComandoSel] = useState('');
  const [ejecutando, setEjecutando] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenGenerado, setTokenGenerado] = useState(null);
  const [generandoToken, setGenerandoToken] = useState(false);

  async function cargarEjecuciones() {
    try {
      const data = await api.get(`/equipos/${equipo.id}/comandos`);
      setEjecuciones(data);
    } catch {
      // silencioso: no es crítico si falla el refresco del historial
    }
  }

  useEffect(() => {
    api.get('/equipos/comandos/catalogo').then(setCatalogo).catch(() => {});
    cargarEjecuciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.id]);

  async function generarToken() {
    setGenerandoToken(true);
    try {
      const { token } = await api.post(`/equipos/${equipo.id}/agente-token`);
      setTokenGenerado(token);
      setTokenDialogOpen(true);
      onEquipoChange?.();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setGenerandoToken(false);
    }
  }

  async function ejecutarComando() {
    if (!comandoSel) return;
    setEjecutando(true);
    try {
      await api.post(`/equipos/${equipo.id}/comandos`, { comando_id: comandoSel });
      showToast('Command queued: the agent will run it on its next check-in', 'success');
      setComandoSel('');
      cargarEjecuciones();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setEjecutando(false);
    }
  }

  function copiarToken() {
    navigator.clipboard?.writeText(tokenGenerado);
    showToast('Token copied to the clipboard', 'success');
  }

  return (
    <Paper sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Remote commands
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mt: 0.5 }}>
            <CircleIcon sx={{ fontSize: 8, color: equipo.agente_instalado ? '#4ade80' : 'text.disabled' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {equipo.agente_instalado
                ? `Agent installed${equipo.agente_ultimo_contacto ? ` · last check-in ${formatDate(equipo.agente_ultimo_contacto)}` : ' · no check-in yet'}`
                : 'No agent installed'}
            </Typography>
          </Box>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<KeyIcon sx={{ fontSize: 16 }} />}
          onClick={generarToken}
          disabled={generandoToken}
        >
          {equipo.agente_instalado ? 'Rotate token' : 'Generate agent token'}
        </Button>
      </Box>

      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Select
          size="small"
          displayEmpty
          value={comandoSel}
          onChange={(e) => setComandoSel(e.target.value)}
          disabled={!equipo.agente_instalado}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="" disabled>Select a command…</MenuItem>
          {catalogo.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
          ))}
        </Select>
        <Button
          size="small"
          variant="contained"
          startIcon={<BoltIcon sx={{ fontSize: 16 }} />}
          onClick={ejecutarComando}
          disabled={!equipo.agente_instalado || !comandoSel || ejecutando}
        >
          Run
        </Button>
        {!equipo.agente_instalado && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Generate an agent token to enable remote commands
          </Typography>
        )}
      </Box>

      <Divider />

      {ejecuciones.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>No commands run yet</Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Command</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>Requested by</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ejecuciones.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{e.comando_nombre}</TableCell>
                  <TableCell>
                    <Chip label={label(e.estado)} size="small" color={ESTADO_COLOR[e.estado] ?? 'default'} sx={{ fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', maxWidth: 240 }}>
                    <Tooltip title={e.resultado || ''} arrow>
                      <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.resultado || '—'}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{e.solicitado_por_nombre || '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{formatDate(e.fecha_solicitud)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={tokenDialogOpen} onClose={() => setTokenDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agent token generated</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Copy this token into the agent configuration on the device. For security, it will not be shown again.
          </Typography>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1, p: 1.5,
            bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1.5,
          }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>
              {tokenGenerado}
            </Typography>
            <IconButton size="small" onClick={copiarToken}>
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTokenDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
