'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, Chip, CircularProgress,
  Tooltip, Typography, TextField, Tabs, Tab,
} from '@mui/material';
import FileDownloadIcon  from '@mui/icons-material/FileDownload';
import SearchIcon        from '@mui/icons-material/Search';
import RefreshIcon       from '@mui/icons-material/Refresh';
import PowerIcon         from '@mui/icons-material/Power';
import OpenInNewIcon     from '@mui/icons-material/OpenInNew';
import { useRouter }     from 'next/navigation';
import { api }           from '@/services/api';
import { usePrestamos }  from '@/hooks/usePrestamos';
import { formatDate }    from '@/utils/formatDate';
import { label }         from '@/utils/labels';
import PageHeader        from '@/components/ui/PageHeader';
import AppAlert          from '@/components/ui/AppAlert';

function useHistorial() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetch_ = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await api.get('/historial');
      setRegistros(data);
    } catch (e) {
      setError(e.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(true); }, [fetch_]);
  return { registros, loading, error, refetch: fetch_ };
}

const DEV_COLOR = {
  'Bueno':                  'success',
  'Con daños':              'error',
  'Incompleto':             'warning',
  'Requiere mantenimiento': 'warning',
};

function parseAccesorios(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

/* ─── Tab Préstamos cerrados ──────────────────────────────────────────────── */
function TabPrestamos() {
  const { prestamos, loading, error, refetch } = usePrestamos('/prestamos?estado=Cerrado');
  const [search, setSearch]   = useState('');
  const [downloading, setDownloading] = useState(null);
  const [page, setPage]       = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const router = useRouter();

  const filtrados = prestamos.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.nombre_empleado?.toLowerCase().includes(q) ||
      p.equipo?.codigo_interno?.toLowerCase().includes(q) ||
      p.equipo?.marca?.toLowerCase().includes(q) ||
      p.correo_empleado?.toLowerCase().includes(q)
    );
  });

  async function handleDescargarPDF(prestamo) {
    setDownloading(prestamo.id);
    try {
      const blob = await api.get(`/prestamos/${prestamo.id}/pdf`);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const nombreLimpio = (prestamo.nombre_empleado || 'Employee').replace(/\s+/g, '_');
      const codigoEquipo = prestamo.equipo?.codigo_interno || prestamo.id;
      a.download = `${nombreLimpio}_${codigoEquipo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignorar */
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          placeholder="Search by employee, device, email or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: 420 }}
          slotProps={{
            input: { startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.disabled' }} /> },
          }}
        />
        <Tooltip title="Refresh" arrow>
          <IconButton size="small" onClick={refetch} sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
          {filtrados.length} registros
        </Typography>
      </Box>

      <AppAlert show={Boolean(error)} sx={{ mb: 3 }}>Could not connect to the server</AppAlert>

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
                <TableCell>Returned</TableCell>
                <TableCell>Device condition</TableCell>
                <TableCell>Return notes</TableCell>
                <TableCell align="center">Receipt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, border: 'none' }}>
                    <CircularProgress size={26} sx={{ color: '#1176EF' }} />
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, border: 'none', color: 'text.secondary' }}>
                    No records in the history yet
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/prestamos/${p.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/inventario/${p.equipo?.id}`)}
                      >
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'primary.main', fontFamily: 'monospace' }}>
                          {p.equipo?.codigo_interno}
                        </Typography>
                        <Typography sx={{ fontSize: '0.775rem', color: 'text.secondary' }}>
                          {p.equipo?.marca} / {p.equipo?.modelo}
                        </Typography>
                      </Box>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Chip
                        icon={<PowerIcon sx={{ fontSize: '13px !important' }} />}
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
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{formatDate(p.fecha_devolucion_real)}</TableCell>
                    <TableCell>
                      {p.estado_equipo_devolucion
                        ? <Chip label={label(p.estado_equipo_devolucion)} color={DEV_COLOR[p.estado_equipo_devolucion] ?? 'default'} size="small" />
                        : <Typography sx={{ color: 'text.disabled', fontSize: '0.825rem' }}>—</Typography>
                      }
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      {p.observaciones_devolucion ? (
                        <Tooltip title={p.observaciones_devolucion} arrow placement="top">
                          <Typography
                            sx={{ fontSize: '0.8rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, cursor: 'default' }}
                          >
                            {p.observaciones_devolucion}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography sx={{ color: 'text.disabled', fontSize: '0.825rem' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Download PDF receipt" arrow>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDescargarPDF(p)}
                            disabled={downloading === p.id}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': { color: '#4C9BF5', bgcolor: 'rgba(17,118,239,0.08)' },
                              '&.Mui-disabled': { color: 'text.disabled' },
                            }}
                          >
                            {downloading === p.id
                              ? <CircularProgress size={16} sx={{ color: '#1176EF' }} />
                              : <FileDownloadIcon sx={{ fontSize: 18 }} />
                            }
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtrados.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
        />
      </Paper>
    </>
  );
}

/* ─── Tab Historial de estados ────────────────────────────────────────────── */
function TabHistorialEstados() {
  const { registros, loading, error, refetch } = useHistorial();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const router = useRouter();

  const filtrados = registros.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.equipo_codigo?.toLowerCase().includes(q) ||
      r.equipo_marca?.toLowerCase().includes(q)  ||
      r.equipo_modelo?.toLowerCase().includes(q) ||
      r.usuario_nombre?.toLowerCase().includes(q)||
      r.estado_nuevo?.toLowerCase().includes(q)  ||
      r.estado_anterior?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          placeholder="Search by device, user or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: 420 }}
          slotProps={{
            input: { startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.disabled' }} /> },
          }}
        />
        <Tooltip title="Refresh" arrow>
          <IconButton size="small" onClick={refetch} sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
          {filtrados.length} registros
        </Typography>
      </Box>

      <AppAlert show={Boolean(error)} sx={{ mb: 3 }}>Could not connect to the server</AppAlert>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Status change</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="center">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, border: 'none' }}>
                    <CircularProgress size={26} sx={{ color: '#1176EF' }} />
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, border: 'none', color: 'text.secondary' }}>
                    No status changes recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Box
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/inventario/${r.equipo_id}`)}
                      >
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'primary.main', fontFamily: 'monospace' }}>
                          {r.equipo_codigo || `#${r.equipo_id}`}
                        </Typography>
                        {r.equipo_marca && (
                          <Typography sx={{ fontSize: '0.775rem', color: 'text.secondary' }}>
                            {r.equipo_marca} / {r.equipo_modelo}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {r.estado_anterior ? (
                          <>
                            <Chip label={label(r.estado_anterior)} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>→</Typography>
                          </>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>New →</Typography>
                        )}
                        <Chip label={label(r.estado_nuevo)} size="small" color="primary" sx={{ fontSize: '0.7rem' }} />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                      {r.usuario_nombre || `ID ${r.usuario_id}`}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                      {formatDate(r.fecha)}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem', maxWidth: 200 }}>
                      {r.observacion ? (
                        <Tooltip title={r.observacion} arrow placement="top">
                          <Typography sx={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                            {r.observacion}
                          </Typography>
                        </Tooltip>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View device details" arrow>
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/inventario/${r.equipo_id}`)}
                          sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}
                        >
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtrados.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
        />
      </Paper>
    </>
  );
}

/* ─── Página ──────────────────────────────────────────────────────────────── */
export default function HistorialPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <PageHeader title="History" subtitle="Complete log of hand-overs and status changes" />

      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { fontSize: '0.825rem', fontWeight: 600, textTransform: 'none', minHeight: 44 },
          }}
        >
          <Tab label="Closed loans" />
          <Tab label="Device status changes" />
        </Tabs>
      </Paper>

      {tab === 0 && <TabPrestamos />}
      {tab === 1 && <TabHistorialEstados />}
    </Box>
  );
}
