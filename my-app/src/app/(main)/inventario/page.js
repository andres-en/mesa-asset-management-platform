'use client';

import { useState, useMemo } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, Tooltip, CircularProgress, Typography,
  Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useRouter } from 'next/navigation';
import { useEquipos } from '@/hooks/useEquipos';
import { formatGB }   from '@/utils/formatDate';
import { label } from '@/utils/labels';
import { api } from '@/services/api';
import AppAlert from '@/components/ui/AppAlert';
import EquipoEstadoChip from '@/components/equipos/EquipoEstadoChip';
import EquipoForm from '@/components/equipos/EquipoForm';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

const ESTADOS_FILTRO = ['Todos', 'Disponible', 'Prestado', 'Mantenimiento', 'Dado de baja'];

const ESTADOS_MANUALES = [
  { value: 'Disponible',    color: '#4ade80' },
  { value: 'Mantenimiento', color: '#fb923c' },
  { value: 'Dado de baja',  color: '#f87171' },
];

export default function InventarioPage() {
  const { equipos, loading, error, refetch } = useEquipos();
  const router = useRouter();
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [formOpen, setFormOpen] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuEquipo, setMenuEquipo] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const equiposFiltrados = useMemo(() => {
    return equipos.filter((e) => {
      const matchEstado = filtroEstado === 'Todos' || e.estado === filtroEstado;
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        e.codigo_interno?.toLowerCase().includes(q) ||
        e.numero_serie?.toLowerCase().includes(q) ||
        e.marca?.toLowerCase().includes(q) ||
        e.modelo?.toLowerCase().includes(q) ||
        e.tipo?.toLowerCase().includes(q);
      return matchEstado && matchSearch;
    });
  }, [equipos, filtroEstado, search]);

  function handleNuevo() { setEquipoSeleccionado(null); setFormOpen(true); }
  function handleEditar(equipo) { setEquipoSeleccionado(equipo); setFormOpen(true); }

  function handleAbrirMenu(e, equipo) {
    setMenuAnchor(e.currentTarget);
    setMenuEquipo(equipo);
  }

  function handleCerrarMenu() {
    setMenuAnchor(null);
    setMenuEquipo(null);
  }

  async function handleCambiarEstado(nuevoEstado) {
    if (!menuEquipo || nuevoEstado === menuEquipo.estado) { handleCerrarMenu(); return; }
    const equipo = menuEquipo;
    handleCerrarMenu();
    setCambiandoEstado(equipo.id);
    try {
      await api.put(`/equipos/${equipo.id}`, { estado: nuevoEstado });
      refetch();
      showToast(`Status updated to "${label(nuevoEstado)}"`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCambiandoEstado(null);
    }
  }

  return (
    <Box>
      <PageHeader
        title="Inventory"
        subtitle="Manage the IT equipment catalog"
        actionLabel={isAdmin ? "New device" : undefined}
        onAction={handleNuevo}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search by code, serial, brand, model or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 240, maxWidth: 420 }}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.disabled' }} />,
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filtroEstado} label="Status" onChange={(e) => setFiltroEstado(e.target.value)}>
            {ESTADOS_FILTRO.map((est) => <MenuItem key={est} value={est}>{label(est)}</MenuItem>)}
          </Select>
        </FormControl>
        <Tooltip title="Refresh list" arrow>
          <IconButton size="small" onClick={refetch} sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
          {equiposFiltrados.length} devices
        </Typography>
      </Box>

      <AppAlert show={Boolean(error)} sx={{ mb: 3 }}>Could not connect to the server</AppAlert>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code / Serial</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Brand / Model</TableCell>
                <TableCell>Processor</TableCell>
                <TableCell>RAM</TableCell>
                <TableCell>Storage</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, border: 'none' }}>
                    <CircularProgress size={26} sx={{ color: '#1176EF' }} />
                  </TableCell>
                </TableRow>
              ) : equiposFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, border: 'none', color: 'text.secondary' }}>
                    No devices found
                  </TableCell>
                </TableRow>
              ) : (
                equiposFiltrados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((equipo) => {
                  const prestado  = equipo.estado === 'Prestado';
                  const cargando  = cambiandoEstado === equipo.id;
                  return (
                    <TableRow key={equipo.id}>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'primary.main', fontFamily: 'monospace' }}>
                          {equipo.codigo_interno}
                        </Typography>
                        {equipo.numero_serie && (
                          <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                            S/N: {equipo.numero_serie}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                        {label(equipo.tipo) || '—'}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                          {equipo.marca} / {equipo.modelo}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{equipo.procesador || '—'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{formatGB(equipo.ram)}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{formatGB(equipo.almacenamiento)}</TableCell>
                      <TableCell><EquipoEstadoChip estado={equipo.estado} /></TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'text.secondary',
                          fontSize: '0.8rem',
                        }}
                      >
                        {equipo.observaciones || '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          {isAdmin && (<>
                          {/* Cambiar estado */}
                          <Tooltip title={prestado ? 'Cannot be changed while on loan' : 'Change status'} arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={prestado || cargando}
                                onClick={(e) => handleAbrirMenu(e, equipo)}
                                sx={{
                                  color: 'text.secondary',
                                  '&:hover': { color: '#f59e0b', bgcolor: 'rgba(245,158,11,0.08)' },
                                  '&.Mui-disabled': { opacity: 0.3 },
                                }}
                              >
                                {cargando
                                  ? <CircularProgress size={14} sx={{ color: '#f59e0b' }} />
                                  : <SwapHorizIcon sx={{ fontSize: 16 }} />
                                }
                              </IconButton>
                            </span>
                          </Tooltip>

                          {/* Editar */}
                          <Tooltip title="Edit" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleEditar(equipo)}
                              sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5', bgcolor: 'rgba(17,118,239,0.08)' } }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>

                          </>)}

                          {/* Detalle */}
                          <Tooltip title="View details" arrow>
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/inventario/${equipo.id}`)}
                              sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5', bgcolor: 'rgba(17,118,239,0.08)' } }}
                            >
                              <OpenInNewIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
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
          count={equiposFiltrados.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
        />
      </Paper>

      {/* Menú de cambio de estado */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCerrarMenu}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              borderRadius: 2,
              border: '1px solid rgba(203,213,225,0.15)',
              bgcolor: 'background.paper',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {ESTADOS_MANUALES.map((opt) => {
          const esCurrent = menuEquipo?.estado === opt.value;
          return (
            <MenuItem
              key={opt.value}
              onClick={() => handleCambiarEstado(opt.value)}
              selected={esCurrent}
              sx={{
                fontSize: '0.825rem',
                py: 1,
                opacity: esCurrent ? 0.5 : 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opt.color }} />
              </ListItemIcon>
              <ListItemText primary={label(opt.value)} slotProps={{ primary: { sx: { fontSize: '0.825rem' } } }} />
            </MenuItem>
          );
        })}
      </Menu>

      <EquipoForm
        open={formOpen}
        equipo={equipoSeleccionado}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          refetch();
          showToast(equipoSeleccionado ? 'Device updated successfully' : 'Device created successfully', 'success');
        }}
      />
    </Box>
  );
}
