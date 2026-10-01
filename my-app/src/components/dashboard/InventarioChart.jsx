'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Box, Typography } from '@mui/material';

ChartJS.register(ArcElement, Tooltip, Legend);

const ITEMS = [
  { label: 'Available',     color: '#4ade80', key: 'disponibles' },
  { label: 'On loan',       color: '#fbbf24', key: 'prestados' },
  { label: 'Maintenance',   color: '#f87171', key: 'mantenimiento' },
  { label: 'Retired',       color: '#1E293B', key: 'dadoDeBaja' },
];

function EmptyDonut() {
  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
      <Box
        sx={{
          width: 160, height: 160, flexShrink: 0,
          borderRadius: '50%',
          border: '12px solid rgba(203,213,225,0.06)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: 'text.disabled', lineHeight: 1 }}>—</Typography>
        <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', mt: 0.5 }}>
          no data
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
        {ITEMS.map((item) => (
          <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(203,213,225,0.12)', flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{item.label}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.disabled', minWidth: 24, textAlign: 'right' }}>
              —
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function InventarioChart({ disponibles, prestados, mantenimiento, dadoDeBaja, empty = false }) {
  const values = { disponibles, prestados, mantenimiento, dadoDeBaja };
  const total = disponibles + prestados + mantenimiento + dadoDeBaja;

  const data = {
    labels: ITEMS.map((i) => i.label),
    datasets: [{
      data: ITEMS.map((i) => values[i.key] || 0),
      backgroundColor: ITEMS.map((i) => i.color + '33'),
      borderColor: ITEMS.map((i) => i.color),
      borderWidth: 1.5,
      hoverBackgroundColor: ITEMS.map((i) => i.color + '55'),
      hoverOffset: 4,
    }],
  };

  const options = {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        borderColor: 'rgba(203,213,225,0.1)',
        borderWidth: 1,
        titleColor: '#F1F5F9',
        bodyColor: '#CBD5E1',
        padding: 10,
        callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} devices` },
      },
    },
    cutout: '72%',
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid rgba(148, 163, 184, 0.09)',
        borderRadius: 3,
        p: 3,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        Inventory breakdown
      </Typography>

      {empty ? (
        <EmptyDonut />
      ) : (
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
            <Doughnut data={data} options={options} />
            <Box
              sx={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: 'text.primary', lineHeight: 1 }}>
                {total}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                total
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
            {ITEMS.map((item) => (
              <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{item.label}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.primary', minWidth: 24, textAlign: 'right' }}>
                  {values[item.key]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
