'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Paper, Chip, IconButton, Tooltip,
  CircularProgress, Avatar, Divider,
} from '@mui/material';
import PersonAddIcon         from '@mui/icons-material/PersonAdd';
import DeleteOutlineIcon      from '@mui/icons-material/DeleteOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon             from '@mui/icons-material/Person';
import { useAuth }            from '@/contexts/AuthContext';
import { api }                from '@/services/api';
import PageHeader             from '@/components/ui/PageHeader';
import { useToast }           from '@/contexts/ToastContext';

const ROL_LABELS = { admin: 'Admin', viewer: 'Viewer' };

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [usuarios, setUsuarios]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState(null);
  const [formError, setFormError] = useState(null);

  const [form, setForm] = useState({ nombre: '', correo: '', rol: 'admin' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const loadUsuarios = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await api.get('/auth/usuarios');
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsuarios(true); }, [loadUsuarios]);

  function handleOpenDialog() {
    setForm({ nombre: '', correo: '', rol: 'admin' });
    setFormError(null);
    setOpenDialog(true);
  }

  async function handleCrear() {
    setFormError(null);
    if (!form.nombre.trim() || !form.correo.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.correo.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/usuarios', {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        rol:    form.rol,
      });
      setOpenDialog(false);
      loadUsuarios();
      showToast('User created successfully', 'success');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar(id) {
    if (id === currentUser?.id) return;
    setDeleteId(id);
    try {
      await api.delete(`/auth/usuarios/${id}`);
      loadUsuarios();
      showToast('User deleted', 'warning');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteId(null);
    }
  }

  const initials = (nombre) =>
    nombre ? nombre.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '??';

  if (currentUser?.rol !== 'admin') {
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
        title="User management"
        subtitle="Manage the users who can access the system"
        actionLabel="New user"
        onAction={handleOpenDialog}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} sx={{ color: 'primary.main' }} />
        </Box>
      ) : error ? (
        <Box sx={{
          p: 3, borderRadius: 2,
          bgcolor: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <Typography variant="body2" color="error">{error}</Typography>
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No users yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={u.foto_url}
                            sx={{
                              width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700,
                              background: 'linear-gradient(135deg, #1176EF, #4C9BF5)',
                            }}
                          >
                            {initials(u.nombre)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {u.nombre}
                            </Typography>
                            {u.id === currentUser?.id && (
                              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                (you)
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {u.correo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={u.rol === 'admin'
                            ? <AdminPanelSettingsIcon sx={{ fontSize: '14px !important' }} />
                            : <PersonIcon sx={{ fontSize: '14px !important' }} />
                          }
                          label={ROL_LABELS[u.rol] ?? u.rol}
                          color={u.rol === 'admin' ? 'primary' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={u.id === currentUser?.id ? 'You cannot delete yourself' : 'Delete user'}
                          arrow
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={u.id === currentUser?.id || deleteId === u.id}
                              onClick={() => handleEliminar(u.id)}
                              sx={{
                                color: 'error.main', opacity: 0.7,
                                '&:hover': { opacity: 1 },
                                '&.Mui-disabled': { opacity: 0.25 },
                              }}
                            >
                              {deleteId === u.id
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
          <TablePagination
            component="div"
            count={usuarios.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Rows per page:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
          />
        </Paper>
      )}

      {/* Dialog: crear usuario */}
      <Dialog
        open={openDialog}
        onClose={() => !saving && setOpenDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: 2,
              bgcolor: 'rgba(17,118,239,0.12)',
              border: '1px solid rgba(17,118,239,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PersonAddIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            </Box>
            <Typography fontWeight={700}>Create user</Typography>
          </Box>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full name"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              size="small"
              fullWidth
              autoFocus
              disabled={saving}
            />
            <TextField
              label="Google account email"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              size="small"
              fullWidth
              type="email"
              placeholder="user@example.com"
              disabled={saving}
              helperText="The user must sign in with this Google account"
            />
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1.5, py: 1, borderRadius: 1.5,
              bgcolor: 'rgba(17,118,239,0.07)',
              border: '1px solid rgba(17,118,239,0.18)',
            }}>
              <AdminPanelSettingsIcon sx={{ fontSize: 15, color: 'primary.main' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Will be created with the <strong style={{ color: 'inherit' }}>Admin</strong> role — full access to the system
              </Typography>
            </Box>

            {formError && (
              <Box sx={{
                p: 1.5, borderRadius: 2,
                bgcolor: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <Typography variant="caption" color="error">{formError}</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setOpenDialog(false)}
            disabled={saving}
            size="small"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCrear}
            disabled={saving}
            size="small"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}
          >
            {saving ? 'Creating…' : 'Create user'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
