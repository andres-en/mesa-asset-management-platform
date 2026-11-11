'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, Chip, CircularProgress, Button, IconButton,
  Select, MenuItem, FormControl, TextField,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PageHeader from '@/components/ui/PageHeader';
import AppAlert from '@/components/ui/AppAlert';
import FloorPlan from '@/components/mapa/FloorPlan';
import EquipoEstadoChip from '@/components/equipos/EquipoEstadoChip';
import ComandosRemotos from '@/components/equipos/ComandosRemotos';
import { useEquipos } from '@/hooks/useEquipos';
import { useOficinas } from '@/hooks/useOficinas';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const GRID = 10;

function emptyLayout() {
  return { width: 1100, height: 620, benches: [], desks: [], door: { x: 480, y: 580, w: 140, h: 40 } };
}

let uidCounter = 0;
function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${uidCounter++}`;
}

function rotatePort(p) {
  return p.w > p.h ? { dx: -40, dy: 15, w: 24, h: 90 } : { dx: 10, dy: -40, w: 110, h: 24 };
}

export default function MapaPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { equipos, loading: loadingEquipos, error, refetch: refetchEquipos } = useEquipos();
  const { oficinas, loading: loadingOficinas, refetch: refetchOficinas } = useOficinas();

  const [officeId, setOfficeId] = useState(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [wrapWidth, setWrapWidth] = useState(1100);

  const resizeObserverRef = useRef(null);
  const dragRef = useRef(null);
  const scaleRef = useRef(1);

  // Ref callback (not useEffect): the wrap element only mounts once data has
  // loaded, which can be well after this component's first render/effects.
  const wrapRef = useCallback((el) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (el) {
      setWrapWidth(el.clientWidth);
      const ro = new ResizeObserver((entries) => setWrapWidth(entries[0].target.clientWidth));
      ro.observe(el);
      resizeObserverRef.current = ro;
    }
  }, []);

  const effectiveOfficeId = officeId ?? oficinas[0]?.id ?? null;

  const office = useMemo(
    () => oficinas.find((o) => o.id === effectiveOfficeId) || null,
    [oficinas, effectiveOfficeId],
  );
  const savedLayout = useMemo(() => office?.layout || emptyLayout(), [office]);
  const layout = edit ? draft : savedLayout;

  const equiposById = useMemo(() => new Map(equipos.map((e) => [e.id, e])), [equipos]);

  // Equipos ya ubicados en un puesto de esta u otra oficina (para marcarlos "in use" en el selector).
  const assignedElsewhere = useMemo(() => {
    const set = new Set();
    oficinas.forEach((o) => {
      if (o.id === effectiveOfficeId) return;
      (o.layout?.desks || []).forEach((d) => { if (d.equipoId) set.add(d.equipoId); });
    });
    (layout?.desks || []).forEach((d) => {
      if (d.equipoId && !(selected?.kind === 'desk' && selected.id === d.id)) set.add(d.equipoId);
    });
    return set;
  }, [oficinas, effectiveOfficeId, layout, selected]);

  const scale = useMemo(() => {
    if (!layout) return 1;
    const avail = Math.max(320, wrapWidth - 44);
    return Math.min(1, avail / layout.width);
  }, [wrapWidth, layout]);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const findElement = useCallback((o, kind, id) => {
    if (kind === 'door') return o.door;
    return (kind === 'bench' ? o.benches : o.desks).find((x) => x.id === id);
  }, []);

  const updateDraft = useCallback((fn) => {
    setDraft((d) => {
      const copy = structuredClone(d);
      fn(copy);
      return copy;
    });
  }, []);

  const startDrag = useCallback((e, kind, id) => {
    if (!edit) {
      e.stopPropagation();
      if (kind === 'desk' || kind === 'port') {
        const desk = layout?.desks.find((d) => d.id === id);
        if (desk?.equipoId) setSelected({ kind: 'desk', id });
      }
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const el = findElement(draft, kind === 'port' ? 'desk' : kind, id);
    if (!el) return;
    const bx = kind === 'port' ? el.port.dx : el.x;
    const by = kind === 'port' ? el.port.dy : el.y;
    dragRef.current = { kind, id, sx: e.clientX, sy: e.clientY, bx, by };
    setSelected(kind === 'door' ? null : { kind: kind === 'port' ? 'desk' : kind, id });
  }, [edit, draft, layout, findElement]);

  useEffect(() => {
    function onMove(e) {
      const g = dragRef.current;
      if (!g) return;
      const s = scaleRef.current || 1;
      const nx = Math.round((g.bx + (e.clientX - g.sx) / s) / GRID) * GRID;
      const ny = Math.round((g.by + (e.clientY - g.sy) / s) / GRID) * GRID;
      updateDraft((o) => {
        const el = findElement(o, g.kind === 'port' ? 'desk' : g.kind, g.id);
        if (!el) return;
        if (g.kind === 'port') { el.port.dx = nx; el.port.dy = ny; return; }
        el.x = Math.max(0, Math.min(o.width - el.w, nx));
        el.y = Math.max(0, Math.min(o.height - el.h, ny));
      });
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updateDraft, findElement]);

  function startEdit() {
    setDraft(structuredClone(savedLayout));
    setSelected(null);
    setEdit(true);
  }
  function cancelEdit() {
    setEdit(false);
    setDraft(null);
    setSelected(null);
  }

  async function saveEdit() {
    if (!office || !draft) return;
    setSaving(true);
    try {
      await api.put(`/oficinas/${office.id}/layout`, { layout: draft });

      const before = new Set((savedLayout.desks || []).filter((d) => d.equipoId).map((d) => d.equipoId));
      const after = new Set((draft.desks || []).filter((d) => d.equipoId).map((d) => d.equipoId));
      const added = [...after].filter((id) => !before.has(id));
      const removed = [...before].filter((id) => !after.has(id));

      await Promise.all([
        ...added.map((id) => api.put(`/equipos/${id}`, { oficina_id: office.id }).catch(() => {})),
        ...removed.map((id) => {
          const eq = equiposById.get(id);
          if (eq && eq.oficina_id === office.id) {
            return api.put(`/equipos/${id}`, { oficina_id: null }).catch(() => {});
          }
          return null;
        }),
      ]);

      await Promise.all([refetchOficinas(), refetchEquipos()]);
      setEdit(false);
      setDraft(null);
      setSelected(null);
      showToast('Layout saved', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function addDesk() {
    const id = uid('d');
    updateDraft((o) => {
      o.desks.push({
        id,
        x: Math.round(o.width / 2 / GRID) * GRID - 60,
        y: Math.round(o.height / 2 / GRID) * GRID,
        w: 130, h: 76, vertical: false, vlan: null,
        port: { dx: 10, dy: -40, w: 110, h: 24 },
        equipoId: null,
      });
    });
    setSelected({ kind: 'desk', id });
  }
  function addLine() {
    const id = uid('l');
    updateDraft((o) => { o.benches.push({ id, x: 100, y: 100, w: 400, h: 2 }); });
    setSelected({ kind: 'bench', id });
  }
  function rotateSelected() {
    if (!selected) return;
    updateDraft((o) => {
      const el = findElement(o, selected.kind, selected.id);
      if (!el) return;
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      [el.w, el.h] = [el.h, el.w];
      el.x = Math.round((cx - el.w / 2) / GRID) * GRID;
      el.y = Math.round((cy - el.h / 2) / GRID) * GRID;
      if (selected.kind === 'desk') { el.vertical = !el.vertical; el.port = rotatePort(el.port); }
    });
  }
  function deleteSelected() {
    if (!selected) return;
    updateDraft((o) => {
      if (selected.kind === 'desk') o.desks = o.desks.filter((x) => x.id !== selected.id);
      else o.benches = o.benches.filter((x) => x.id !== selected.id);
    });
    setSelected(null);
  }
  function assignEquipo(value) {
    if (!selected || selected.kind !== 'desk') return;
    const equipoId = value === '' ? null : Number(value);
    updateDraft((o) => {
      const d = o.desks.find((x) => x.id === selected.id);
      if (d) d.equipoId = equipoId;
    });
  }
  function setVlan(value) {
    if (!selected || selected.kind !== 'desk') return;
    const v = value === '' ? null : parseInt(value, 10);
    updateDraft((o) => {
      const d = o.desks.find((x) => x.id === selected.id);
      if (d) d.vlan = Number.isNaN(v) ? null : v;
    });
  }

  const loading = loadingEquipos || loadingOficinas;
  const selectedDesk = selected?.kind === 'desk' ? layout?.desks.find((d) => d.id === selected.id) : null;
  const inspectedEquipo = !edit && selectedDesk?.equipoId ? equiposById.get(selectedDesk.equipoId) : null;
  const total = layout?.desks.length || 0;
  const used = layout?.desks.filter((d) => d.equipoId).length || 0;

  return (
    <Box>
      <PageHeader
        title="Network map"
        subtitle="Where each device sits, with its IP address and network port"
      />

      <AppAlert show={Boolean(error)} sx={{ mb: 3 }}>Could not connect to the server</AppAlert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} sx={{ color: 'primary.main' }} />
        </Box>
      ) : oficinas.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            No offices registered yet. Create one under Administration → Offices.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5, mb: 2.5 }}>
            <FormControl size="small" sx={{ minWidth: 230 }}>
              <Select
                value={effectiveOfficeId ?? ''}
                onChange={(e) => { setOfficeId(e.target.value); setEdit(false); setDraft(null); setSelected(null); }}
                disabled={edit}
                displayEmpty
              >
                {oficinas.map((o) => <MenuItem key={o.id} value={o.id}>{o.nombre}</MenuItem>)}
              </Select>
            </FormControl>

            {!edit && isAdmin && (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={startEdit}>
                Edit layout
              </Button>
            )}
            {edit && isAdmin && (
              <>
                <Button variant="outlined" size="small" onClick={addDesk}>+ Desk</Button>
                <Button variant="outlined" size="small" onClick={addLine}>+ Divider</Button>
                <Button variant="text" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                <Button variant="contained" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'stretch' }}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2.75, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(17,118,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BusinessIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary' }}>{office?.nombre}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, ml: 'auto' }}>
                <Chip label={`${total} desks`} size="small" />
                <Chip label={`${used} occupied`} size="small" color="success" />
                <Chip label={`${total - used} free`} size="small" />
              </Box>
            </Box>

            {edit && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, px: 2.75, py: 1.5, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', fontSize: 13 }}>
                {!selected && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Edit mode · drag desks, dividers, network ports or the door. Select an element to edit it.
                  </Typography>
                )}
                {selectedDesk && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>Desk</Typography>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <Select value={selectedDesk.equipoId ?? ''} onChange={(e) => assignEquipo(e.target.value)} displayEmpty>
                        <MenuItem value=""><em>— Free —</em></MenuItem>
                        {equipos.map((it) => (
                          <MenuItem key={it.id} value={it.id}>
                            {it.codigo_interno}{assignedElsewhere.has(it.id) ? '  (in use)' : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="VLAN" size="small" type="number" value={selectedDesk.vlan ?? ''}
                      onChange={(e) => setVlan(e.target.value)} sx={{ width: 100 }}
                    />
                  </>
                )}
                {selected?.kind === 'bench' && (
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>Desk divider</Typography>
                )}
                {selected && (
                  <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                    <Button size="small" variant="outlined" startIcon={<RotateRightIcon />} onClick={rotateSelected}>Rotate 90°</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={deleteSelected}>Delete</Button>
                  </Box>
                )}
              </Box>
            )}

            <Box ref={wrapRef} sx={{ p: 2.75, overflow: 'auto' }}>
              {layout && (
                <FloorPlan
                  layout={layout}
                  scale={scale}
                  edit={edit}
                  selected={selected}
                  equiposById={equiposById}
                  showIP
                  onDeskDown={(e, id) => startDrag(e, 'desk', id)}
                  onBenchDown={(e, id) => startDrag(e, 'bench', id)}
                  onPortDown={(e, id) => startDrag(e, 'port', id)}
                  onDoorDown={(e) => startDrag(e, 'door')}
                  onClearSelection={() => setSelected(null)}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, px: 2.75, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 22, height: 2, bgcolor: 'rgba(100,116,139,0.6)' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Desk divider</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 22, height: 12, borderRadius: 0.5, bgcolor: 'rgba(34,197,94,0.16)', border: '1px solid', borderColor: 'success.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Network port (VLAN)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 22, height: 12, borderRadius: 0.5, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Desk with a device</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 22, height: 12, borderRadius: 0.5, border: '1px dashed rgba(100,116,139,0.6)' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Free desk</Typography>
              </Box>
            </Box>
          </Paper>

          {inspectedEquipo && (
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', width: 340, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{inspectedEquipo.codigo_interno}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {inspectedEquipo.marca} {inspectedEquipo.modelo}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: 'text.secondary', flexShrink: 0 }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <EquipoEstadoChip estado={inspectedEquipo.estado} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Hostname</Typography>
                    <Typography variant="body2">{inspectedEquipo.hostname || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>IP</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{inspectedEquipo.ip || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>VLAN</Typography>
                    <Typography variant="body2">{inspectedEquipo.vlan || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>MAC</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{inspectedEquipo.mac_address || '—'}</Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="text"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  onClick={() => router.push(`/inventario/${inspectedEquipo.id}`)}
                  sx={{ alignSelf: 'flex-start', px: 0 }}
                >
                  Open device details
                </Button>
              </Box>

              {isAdmin && (
                <Box sx={{ px: 2.5, pb: 2.5 }}>
                  <ComandosRemotos equipo={inspectedEquipo} onEquipoChange={refetchEquipos} />
                </Box>
              )}
            </Paper>
          )}
          </Box>
        </>
      )}
    </Box>
  );
}
