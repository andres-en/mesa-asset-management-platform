'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, Tooltip,
  CircularProgress, Divider,
} from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/contexts/ToastContext';
import { useOficinas } from '@/hooks/useOficinas';

const EMPTY = { nombre: '', direccion: '', ciudad: '' };

export default function OficinasPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const { oficinas, loading, error, refetch } = useOficinas();

  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function handleOpenNueva() {
    setEditando(null);
    setForm(EMPTY);
    setFormError(null);
    setOpenDialog(true);
  }

  function handleOpenEditar(oficina) {
    setEditando(oficina);
    setForm({ nombre: oficina.nombre, direccion: oficina.direccion || '', ciudad: oficina.ciudad || '' });
    setFormError(null);
    setOpenDialog(true);
  }

  async function handleGuardar() {
    setFormError(null);
    if (!form.nombre.trim()) {
      setFormError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/oficinas/${editando.id}`, form);
        showToast('Office updated', 'success');
      } else {
        await api.post('/oficinas', form);
        showToast('Office created', 'success');
      }
      setOpenDialog(false);
      refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar(id) {
    setDeleteId(id);
    try {
      await api.delete(`/oficinas/${id}`);
      refetch();
      showToast('Office deleted', 'warning');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleteId(null);
    }
  }

  if (!isAdmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          You do not have permission to access this section.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Offices"
        subtitle="Manage the physical locations where devices are deployed"
        actionLabel="New office"
        onAction={handleOpenNueva}
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
                  <TableCell>Name</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Devices</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {oficinas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No offices registered.
                    </TableCell>
                  </TableRow>
                ) : (
                  oficinas.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{o.nombre}</Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{o.ciudad || '—'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>{o.direccion || '—'}</TableCell>
                      <TableCell>
                        <Chip label={o.total_equipos} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit" arrow>
                          <IconButton size="small" onClick={() => handleOpenEditar(o)} sx={{ color: 'text.secondary', '&:hover': { color: '#4C9BF5' } }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={o.total_equipos > 0 ? 'Cannot delete: devices are assigned to it' : 'Delete office'} arrow>
                          <span>
                            <IconButton
                              size="small"
                              disabled={o.total_equipos > 0 || deleteId === o.id}
                              onClick={() => handleEliminar(o.id)}
                              sx={{ color: 'error.main', opacity: 0.7, '&:hover': { opacity: 1 }, '&.Mui-disabled': { opacity: 0.25 } }}
                            >
                              {deleteId === o.id
                                ? <CircularProgress size={16} color="inherit" />
                                : <DeleteOutlineIcon sx={{ fontSize: 18 }} />
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
        </Paper>
      )}

      <Dialog open={openDialog} onClose={() => !saving && setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: 2,
              bgcolor: 'rgba(17,118,239,0.12)', border: '1px solid rgba(17,118,239,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AddBusinessIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            </Box>
            <Typography fontWeight={700}>{editando ? 'Edit office' : 'Create office'}</Typography>
          </Box>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              size="small"
              fullWidth
              autoFocus
              disabled={saving}
              placeholder="e.g. Bogotá - HQ"
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="City"
              value={form.ciudad}
              onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
              size="small"
              fullWidth
              disabled={saving}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="Address"
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
              size="small"
              fullWidth
              disabled={saving}
              slotProps={{ htmlInput: { maxLength: 255 } }}
            />

            {formError && (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Typography variant="caption" color="error">{formError}</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" onClick={() => setOpenDialog(false)} disabled={saving} size="small">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGuardar}
            disabled={saving}
            size="small"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddBusinessIcon />}
          >
            {saving ? 'Saving…' : editando ? 'Save changes' : 'Create office'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
