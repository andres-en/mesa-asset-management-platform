'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Chip, IconButton, Tooltip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import CircleIcon        from '@mui/icons-material/Circle';
import OpenInNewIcon      from '@mui/icons-material/OpenInNew';
import { useAuth }        from '@/contexts/AuthContext';
import { useEquipos }      from '@/hooks/useEquipos';
import PageHeader          from '@/components/ui/PageHeader';
import { formatDateTime }  from '@/utils/formatDate';

const SIN_CONTACTO_RECIENTE_MS = 90 * 1000; // margen de ~3 polls antes de marcar desconectado

function estadoConexion(equipo, now) {
  if (!equipo.agente_instalado) return { label: 'No agent', color: 'default', dot: 'text.disabled' };
  if (!equipo.agente_ultimo_contacto) return { label: 'Never checked in', color: 'warning', dot: '#fbbf24' };
  const transcurrido = now - new Date(equipo.agente_ultimo_contacto).getTime();
  return transcurrido <= SIN_CONTACTO_RECIENTE_MS
    ? { label: 'Online', color: 'success', dot: '#4ade80' }
    : { label: 'Offline', color: 'error', dot: '#f87171' };
}

export default function AgentesPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { equipos, loading, error } = useEquipos();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  if (!isAdmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          You do not have permission to access this section.
        </Typography>
      </Box>
    );
  }

  const instalados = equipos.filter((e) => e.agente_instalado);
  const enLinea = instalados.filter(
    (e) => e.agente_ultimo_contacto && now - new Date(e.agente_ultimo_contacto).getTime() <= SIN_CONTACTO_RECIENTE_MS
  );

  return (
    <Box>
      <PageHeader
        title="Agents"
        subtitle={`${instalados.length} devices with an agent installed · ${enLinea.length} online`}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} sx={{ color: 'primary.main' }} />
        </Box>
      ) : error ? (
        <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Typography variant="body2" color="error">{error}</Typography>
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>Office</TableCell>
                  <TableCell>Connection</TableCell>
                  <TableCell>Last check-in</TableCell>
                  <TableCell align="right">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {equipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No devices registered.
                    </TableCell>
                  </TableRow>
                ) : (
                  equipos.map((e) => {
                    const estado = estadoConexion(e, now);
                    return (
                      <TableRow key={e.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{e.codigo_interno}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {e.hostname || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                          {e.oficina_nombre || '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<CircleIcon sx={{ fontSize: '10px !important', color: `${estado.dot} !important` }} />}
                            label={estado.label}
                            size="small"
                            color={estado.color}
                            variant={estado.color === 'default' ? 'outlined' : 'filled'}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                          {formatDateTime(e.agente_ultimo_contacto)}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Open device details" arrow>
                            <IconButton size="small" onClick={() => router.push(`/inventario/${e.id}`)} sx={{ color: 'text.secondary' }}>
                              <OpenInNewIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
