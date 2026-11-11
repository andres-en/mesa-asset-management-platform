'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import AppAlert from '@/components/ui/AppAlert';
import ComputerIcon from '@mui/icons-material/Computer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import BlockIcon from '@mui/icons-material/Block';
import DrawIcon from '@mui/icons-material/Draw';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useEquipos } from '@/hooks/useEquipos';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import KpiCard from '@/components/dashboard/KpiCard';
import InventarioChart from '@/components/dashboard/InventarioChart';

const KPI_EQUIPOS = [
  { title: 'Total devices',    key: 'total',         icon: <ComputerIcon />,     color: 'primary' },
  { title: 'Available',        key: 'disponibles',   icon: <CheckCircleIcon />,  color: 'success' },
  { title: 'On loan',          key: 'prestados',     icon: <AssignmentIcon />,   color: 'warning' },
  { title: 'In maintenance',   key: 'mantenimiento', icon: <BuildIcon />,        color: 'error'   },
  { title: 'Retired',          key: 'dadoDeBaja',    icon: <BlockIcon />,        color: 'error'   },
];

const KPI_PRESTAMOS = [
  { title: 'Active loans',        key: 'activos',          icon: <AssignmentIcon />,   color: 'primary' },
  { title: 'Pending signature',   key: 'pendientesFirma',  icon: <DrawIcon />,         color: 'warning' },
  { title: 'Expired signatures',  key: 'firmasExpiradas',  icon: <ErrorOutlinedIcon />, color: 'error'   },
];

const KPI_COMANDOS = [
  { title: 'Pending commands', key: 'pendiente', icon: <HourglassEmptyIcon />, color: 'warning' },
  { title: 'Failed commands',  key: 'fallido',   icon: <ReportProblemIcon />,  color: 'error'   },
];

function esExpirado(p) {
  if (p.estado_firma === 'pendiente_remota' && p.token_expira_at) {
    return new Date() > new Date(p.token_expira_at);
  }
  return false;
}

function KpiSkeleton({ color }) {
  const borderMap = {
    primary: 'rgba(17,118,239,0.2)',
    success: 'rgba(74,222,128,0.18)',
    warning: 'rgba(251,191,36,0.18)',
    error:   'rgba(248,113,113,0.18)',
  };
  return (
    <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${borderMap[color] ?? borderMap.primary}`, borderRadius: 3, p: 3 }}>
      <Skeleton variant="text" width="55%" height={14} sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 1.5 }} />
      <Skeleton variant="text" width="40%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
    </Box>
  );
}

function ChartSkeleton() {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid rgba(203,213,225,0.12)', borderRadius: 3, p: 3, maxWidth: 480 }}>
      <Skeleton variant="text" width="45%" height={14} sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 3 }} />
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <Skeleton variant="circular" width={160} height={160} sx={{ bgcolor: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="text" width={`${60 + i * 8}%`} height={12} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function SectionLabel({ children }) {
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1.5 }}>
      {children}
    </Typography>
  );
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const { equipos, loading: loadingEquipos, error: errorEquipos } = useEquipos();
  const { prestamos, loading: loadingPrestamos, error: errorPrestamos } = usePrestamos('/prestamos?estado=Activo');

  const [resumenComandos, setResumenComandos] = useState(null);
  const [loadingComandos, setLoadingComandos] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/equipos/comandos/resumen')
      .then(setResumenComandos)
      .catch(() => {})
      .finally(() => setLoadingComandos(false));
  }, [isAdmin]);

  const hasEquipos  = !loadingEquipos  && !errorEquipos  && equipos.length  > 0;
  const hasPrestamos = !loadingPrestamos && !errorPrestamos;

  const disponibles = equipos.filter((e) => e.estado === 'Disponible');

  const statsEquipos = {
    total:         equipos.length,
    disponibles:   disponibles.length,
    prestados:     equipos.filter((e) => e.estado === 'Prestado').length,
    mantenimiento: equipos.filter((e) => e.estado === 'Mantenimiento').length,
    dadoDeBaja:    equipos.filter((e) => e.estado === 'Dado de baja').length,
  };

  const disponiblesBodega  = disponibles.filter((e) => !e.oficina_id).length;
  const disponiblesOficina = disponibles.filter((e) => e.oficina_id).length;

  const statsPrestamos = {
    activos:         prestamos.length,
    pendientesFirma: prestamos.filter((p) => p.estado_firma === 'pendiente_remota' && !esExpirado(p)).length,
    firmasExpiradas: prestamos.filter((p) => esExpirado(p)).length,
  };

  const hasComandos = isAdmin && !loadingComandos && resumenComandos !== null;
  const statsComandos = {
    pendiente: (resumenComandos?.pendiente ?? 0) + (resumenComandos?.en_progreso ?? 0),
    fallido:   resumenComandos?.fallido ?? 0,
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ color: 'text.primary', letterSpacing: '-0.01em' }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Overview of the current inventory status
        </Typography>
      </Box>

      <AppAlert show={Boolean(errorEquipos || errorPrestamos)} sx={{ mb: 3 }}>
        Could not connect to the server
      </AppAlert>

      {/* KPIs de equipos */}
      <SectionLabel>Device inventory</SectionLabel>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        {loadingEquipos
          ? KPI_EQUIPOS.map((d) => <KpiSkeleton key={d.key} color={d.color} />)
          : KPI_EQUIPOS.map((d) => (
              <KpiCard
                key={d.key}
                title={d.title}
                value={hasEquipos ? statsEquipos[d.key] : '—'}
                subtitle={d.key === 'disponibles' && hasEquipos ? `${disponiblesBodega} in warehouse · ${disponiblesOficina} at offices` : undefined}
                icon={d.icon}
                color={d.color}
                empty={!hasEquipos}
              />
            ))
        }
      </Box>

      {/* KPIs de préstamos */}
      <SectionLabel>Loans</SectionLabel>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        {loadingPrestamos
          ? KPI_PRESTAMOS.map((d) => <KpiSkeleton key={d.key} color={d.color} />)
          : KPI_PRESTAMOS.map((d) => (
              <KpiCard
                key={d.key}
                title={d.title}
                value={hasPrestamos ? statsPrestamos[d.key] : '—'}
                icon={d.icon}
                color={d.color}
                empty={!hasPrestamos}
              />
            ))
        }
      </Box>

      {/* KPIs de comandos remotos (solo admin) */}
      {isAdmin && (
        <>
          <SectionLabel>Remote commands</SectionLabel>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2.5,
              mb: 4,
            }}
          >
            {loadingComandos
              ? KPI_COMANDOS.map((d) => <KpiSkeleton key={d.key} color={d.color} />)
              : KPI_COMANDOS.map((d) => (
                  <KpiCard
                    key={d.key}
                    title={d.title}
                    value={hasComandos ? statsComandos[d.key] : '—'}
                    icon={d.icon}
                    color={d.color}
                    empty={!hasComandos}
                  />
                ))
            }
          </Box>
        </>
      )}

      {/* Chart */}
      {loadingEquipos ? (
        <ChartSkeleton />
      ) : (
        <Box sx={{ maxWidth: 480 }}>
          <InventarioChart
            disponibles={statsEquipos.disponibles}
            prestados={statsEquipos.prestados}
            mantenimiento={statsEquipos.mantenimiento}
            dadoDeBaja={statsEquipos.dadoDeBaja}
            empty={!hasEquipos}
          />
        </Box>
      )}
    </Box>
  );
}
