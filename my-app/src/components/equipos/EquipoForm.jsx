'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, MenuItem,
  InputAdornment, Select, FormControl,
} from '@mui/material';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { label } from '@/utils/labels';
import { useOficinas } from '@/hooks/useOficinas';

const TIPOS = ['Laptop', 'Desktop', 'Monitor', 'Tablet', 'Servidor', 'Impresora', 'Otro'];

const EMPTY = {
  codigo_interno:  '',
  tipo:            '',
  marca:           '',
  modelo:          '',
  numero_serie:    '',
  procesador:      '',
  ram:             '',
  almacenamiento:  '',
  observaciones:   '',
  oficina_id:      '',
  hostname:        '',
  ip:              '',
  vlan:            '',
  mac_address:     '',
};

// ─── Helpers para parsear/combinar valores con unidad ────────────────────────

function parseStorage(raw) {
  if (!raw) return { num: '', unit: 'GB', tipo: '' };
  const m = String(raw).trim().match(/^(\d+(?:\.\d+)?)\s*(GB|TB)?\s*(SSD|HDD|NVMe)?/i);
  if (!m) return { num: raw, unit: 'GB', tipo: '' };
  return {
    num:  m[1] || '',
    unit: m[2] ? m[2].toUpperCase() : 'GB',
    tipo: m[3] ? m[3].toUpperCase() : '',
  };
}

function combineStorage(num, unit, tipo) {
  if (!num) return '';
  return [num, unit, tipo].filter(Boolean).join(' ');
}

function parseRam(raw) {
  if (!raw) return { num: '', unit: 'GB' };
  const m = String(raw).trim().match(/^(\d+(?:\.\d+)?)\s*(GB|TB)?/i);
  if (!m) return { num: raw, unit: 'GB' };
  return { num: m[1] || '', unit: m[2] ? m[2].toUpperCase() : 'GB' };
}

function combineRam(num, unit) {
  return num ? `${num} ${unit}` : '';
}

// ─── Campo RAM con selector GB/TB ─────────────────────────────────────────────

function RamField({ value, onChange, disabled }) {
  const parsed = parseRam(value);

  const emit = (num, unit) => onChange(combineRam(num, unit));

  return (
    <TextField
      label="RAM"
      value={parsed.num}
      onChange={(e) => emit(e.target.value, parsed.unit)}
      fullWidth
      disabled={disabled}
      type="number"
      placeholder="16"
      slotProps={{
        htmlInput: { min: 0, step: 1 },
        input: {
          endAdornment: (
            <InputAdornment position="end" sx={{ ml: 0 }}>
              <FormControl variant="standard" size="small" sx={{ minWidth: 52 }}>
                <Select
                  value={parsed.unit}
                  onChange={(e) => emit(parsed.num, e.target.value)}
                  disableUnderline
                  disabled={disabled}
                  sx={{ fontSize: '0.825rem', color: 'text.secondary', pl: 0.5 }}
                >
                  <MenuItem value="GB">GB</MenuItem>
                  <MenuItem value="TB">TB</MenuItem>
                </Select>
              </FormControl>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

// ─── Campo Almacenamiento con selector GB/TB + SSD/HDD/NVMe ─────────────────

function StorageField({ value, onChange, disabled }) {
  const parsed = parseStorage(value);

  const emit = (num, unit, tipo) => onChange(combineStorage(num, unit, tipo));

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <TextField
        label="Storage"
        value={parsed.num}
        onChange={(e) => emit(e.target.value, parsed.unit, parsed.tipo)}
        fullWidth
        disabled={disabled}
        type="number"
        placeholder="512"
        slotProps={{
          htmlInput: { min: 0, step: 1 },
          input: {
            endAdornment: (
              <InputAdornment position="end" sx={{ ml: 0 }}>
                <FormControl variant="standard" size="small" sx={{ minWidth: 52 }}>
                  <Select
                    value={parsed.unit}
                    onChange={(e) => emit(parsed.num, e.target.value, parsed.tipo)}
                    disableUnderline
                    disabled={disabled}
                    sx={{ fontSize: '0.825rem', color: 'text.secondary', pl: 0.5 }}
                  >
                    <MenuItem value="GB">GB</MenuItem>
                    <MenuItem value="TB">TB</MenuItem>
                  </Select>
                </FormControl>
              </InputAdornment>
            ),
          },
        }}
      />
      <FormControl size="small" sx={{ minWidth: 90, flexShrink: 0 }}>
        <Select
          value={parsed.tipo}
          onChange={(e) => emit(parsed.num, parsed.unit, e.target.value)}
          disabled={disabled}
          displayEmpty
          sx={{ fontSize: '0.825rem' }}
        >
          <MenuItem value=""><em style={{ fontSize: '0.8rem' }}>Type</em></MenuItem>
          <MenuItem value="SSD">SSD</MenuItem>
          <MenuItem value="HDD">HDD</MenuItem>
          <MenuItem value="NVME">NVMe</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}

// ─── Formulario principal ──────────────────────────────────────────────────────

export default function EquipoForm({ open, equipo, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { oficinas } = useOficinas();
  const editing = Boolean(equipo?.id);

  useEffect(() => {
    if (open) {
      setForm(
        equipo
          ? {
              codigo_interno:  equipo.codigo_interno  ?? '',
              tipo:            equipo.tipo             ?? '',
              marca:           equipo.marca            ?? '',
              modelo:          equipo.modelo           ?? '',
              numero_serie:    equipo.numero_serie     ?? '',
              procesador:      equipo.procesador       ?? '',
              ram:             equipo.ram              ?? '',
              almacenamiento:  equipo.almacenamiento   ?? '',
              observaciones:   equipo.observaciones    ?? '',
              oficina_id:      equipo.oficina_id        ?? '',
              hostname:        equipo.hostname          ?? '',
              ip:              equipo.ip                ?? '',
              vlan:            equipo.vlan              ?? '',
              mac_address:     equipo.mac_address       ?? '',
            }
          : EMPTY
      );
    }
  }, [equipo, open]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, oficina_id: form.oficina_id || null };
      if (editing) {
        await api.put(`/equipos/${equipo.id}`, payload);
      } else {
        await api.post('/equipos', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit device' : 'Register device'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 0.5 }}>
            <TextField
              label="Internal code"
              name="codigo_interno"
              value={form.codigo_interno}
              onChange={handleChange}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 50 } }}
            />
            <TextField
              select
              label="Device type"
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value=""><em>Not specified</em></MenuItem>
              {TIPOS.map((t) => <MenuItem key={t} value={t}>{label(t)}</MenuItem>)}
            </TextField>
            <TextField
              label="Brand"
              name="marca"
              value={form.marca}
              onChange={handleChange}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label="Model"
              name="modelo"
              value={form.modelo}
              onChange={handleChange}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label="Serial number"
              name="numero_serie"
              value={form.numero_serie}
              onChange={handleChange}
              fullWidth
              placeholder="e.g. SN-ABC123"
              slotProps={{ htmlInput: { maxLength: 100 } }}
              sx={{ gridColumn: { sm: 'span 2' } }}
            />
            <TextField
              label="Processor"
              name="procesador"
              value={form.procesador}
              onChange={handleChange}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            <RamField
              value={form.ram}
              onChange={(v) => setForm((p) => ({ ...p, ram: v }))}
              disabled={loading}
            />

            <Box sx={{ gridColumn: { sm: 'span 2' } }}>
              <StorageField
                value={form.almacenamiento}
                onChange={(v) => setForm((p) => ({ ...p, almacenamiento: v }))}
                disabled={loading}
              />
            </Box>

            <TextField
              label="Notes"
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: { sm: 'span 2' } }}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />

            <Box sx={{ gridColumn: { sm: 'span 2' }, mt: 1 }}>
              <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Location and network
              </Box>
            </Box>

            <TextField
              select
              label="Office"
              name="oficina_id"
              value={form.oficina_id}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value=""><em>Unassigned</em></MenuItem>
              {oficinas.map((o) => <MenuItem key={o.id} value={o.id}>{o.nombre}</MenuItem>)}
            </TextField>
            <TextField
              label="Device name (hostname)"
              name="hostname"
              value={form.hostname}
              onChange={handleChange}
              fullWidth
              placeholder="PC-HQ-001"
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="IP address"
              name="ip"
              value={form.ip}
              onChange={handleChange}
              fullWidth
              placeholder="10.0.0.23"
              slotProps={{ htmlInput: { maxLength: 45 } }}
            />
            <TextField
              label="VLAN"
              name="vlan"
              value={form.vlan}
              onChange={handleChange}
              fullWidth
              type="number"
              placeholder="20"
              slotProps={{ htmlInput: { min: 1, max: 4094 } }}
            />
            <TextField
              label="MAC address"
              name="mac_address"
              value={form.mac_address}
              onChange={handleChange}
              fullWidth
              placeholder="AA:BB:CC:DD:EE:FF"
              sx={{ gridColumn: { sm: 'span 2' } }}
              slotProps={{ htmlInput: { maxLength: 17 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button type="button" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
