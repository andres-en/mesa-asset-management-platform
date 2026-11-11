'use client';

import { Box, Typography, alpha } from '@mui/material';
import LaptopIcon from '@mui/icons-material/Laptop';
import ComputerIcon from '@mui/icons-material/Computer';

function Bench({ bench, selected, edit, onPointerDown }) {
  const isLine = Math.min(bench.w, bench.h) <= 6;
  return (
    <Box
      onPointerDown={onPointerDown}
      sx={{
        position: 'absolute',
        left: bench.x,
        top: bench.y,
        width: bench.w,
        height: bench.h,
        cursor: edit ? 'grab' : 'default',
        ...(isLine
          ? {
              bgcolor: selected ? 'primary.main' : alpha('#64748b', 0.6),
            }
          : {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              border: '1px solid',
              borderColor: selected ? 'primary.main' : (theme) => alpha(theme.palette.primary.main, 0.5),
              borderRadius: 0.75,
              boxShadow: selected ? (theme) => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.22)}` : 'none',
            }),
      }}
    />
  );
}

function Port({ desk, selected, edit, onPointerDown }) {
  const p = desk.port;
  const vertical = p.h > p.w;
  return (
    <Box
      onPointerDown={onPointerDown}
      sx={{
        position: 'absolute',
        left: desk.x + p.dx,
        top: desk.y + p.dy,
        width: p.w,
        height: p.h,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: edit ? 'grab' : 'default',
        bgcolor: (theme) => alpha(theme.palette.success.main, 0.16),
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'success.main',
        borderRadius: 0.6,
        boxShadow: selected ? (theme) => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.22)}` : 'none',
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 600,
          color: 'success.main',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          writingMode: vertical ? 'vertical-rl' : 'horizontal-tb',
        }}
      >
        {desk.vlan ? `VLAN ${desk.vlan}` : 'VLAN —'}
      </Typography>
    </Box>
  );
}

function Desk({ desk, equipo, showIP, selected, edit, onPointerDown }) {
  const vertical = !!desk.vertical;
  return (
    <Box
      onPointerDown={onPointerDown}
      sx={{
        position: 'absolute',
        left: desk.x,
        top: desk.y,
        width: desk.w,
        height: desk.h,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        overflow: 'hidden',
        cursor: edit ? 'grab' : (equipo ? 'pointer' : 'default'),
        borderRadius: 1,
        bgcolor: equipo ? 'background.default' : (theme) => alpha(theme.palette.background.default, 0.4),
        border: '1px solid',
        borderStyle: equipo ? 'solid' : 'dashed',
        borderColor: selected ? 'primary.main' : (equipo ? 'divider' : alpha('#64748b', 0.45)),
        boxShadow: selected ? (theme) => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.22)}` : 'none',
      }}
    >
      {!equipo && (
        <Typography sx={{ fontSize: 11, color: 'text.disabled', writingMode: vertical ? 'vertical-rl' : 'horizontal-tb' }}>
          Free
        </Typography>
      )}
      {equipo && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            width: vertical ? 'auto' : '100%',
            px: vertical ? 0 : 1,
            alignItems: 'flex-start',
            ...(vertical
              ? { flexDirection: 'column', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }
              : { flexDirection: 'column' }),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            {equipo.tipo === 'Laptop'
              ? <LaptopIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              : <ComputerIcon sx={{ fontSize: 13, color: 'text.disabled' }} />}
            <Typography sx={{ fontFamily: 'monospace', fontSize: 10.5, fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap' }}>
              {equipo.codigo_interno}
            </Typography>
          </Box>
          {showIP && (
            <Typography sx={{ fontFamily: 'monospace', fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {equipo.ip || '—'}
            </Typography>
          )}
          <Typography sx={{ fontSize: 10, color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {equipo.tipo || '—'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function FloorPlan({
  layout, scale, edit, selected, equiposById, showIP,
  onDeskDown, onBenchDown, onPortDown, onDoorDown, onClearSelection,
}) {
  const isSel = (kind, id) => selected && selected.kind === kind && selected.id === id;

  return (
    <Box sx={{ position: 'relative', width: layout.width * scale, height: layout.height * scale }}>
      <Box
        onPointerDown={() => onClearSelection()}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: layout.width,
          height: layout.height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          bgcolor: 'background.paper',
          border: '2px solid',
          borderColor: edit ? 'primary.main' : 'divider',
          borderRadius: 1.5,
          backgroundImage: edit ? (theme) => `radial-gradient(${alpha(theme.palette.text.primary, 0.12)} 1px, transparent 1px)` : 'none',
          backgroundSize: '20px 20px',
          touchAction: 'none',
        }}
      >
        {layout.benches.map((b) => (
          <Bench key={b.id} bench={b} selected={isSel('bench', b.id)} edit={edit} onPointerDown={(e) => onBenchDown(e, b.id)} />
        ))}
        {layout.desks.map((d) => (
          <Port key={d.id} desk={d} selected={isSel('desk', d.id)} edit={edit} onPointerDown={(e) => onPortDown(e, d.id)} />
        ))}
        {layout.desks.map((d) => (
          <Desk
            key={d.id}
            desk={d}
            equipo={d.equipoId ? equiposById.get(d.equipoId) : null}
            showIP={showIP}
            selected={isSel('desk', d.id)}
            edit={edit}
            onPointerDown={(e) => onDeskDown(e, d.id)}
          />
        ))}
        <Box
          onPointerDown={onDoorDown}
          sx={{
            position: 'absolute',
            left: layout.door.x,
            top: layout.door.y,
            width: layout.door.w,
            height: layout.door.h,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            cursor: edit ? 'grab' : 'default',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'text.disabled',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', color: 'text.secondary' }}>
            DOOR
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
