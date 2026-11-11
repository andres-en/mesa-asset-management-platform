import { Card, CardContent, Box, Typography } from '@mui/material';

const COLOR_MAP = {
  primary: { glow: 'rgba(17,118,239,0.15)',  border: 'rgba(17,118,239,0.2)',  icon: 'rgba(17,118,239,0.12)',  text: '#4C9BF5' },
  success: { glow: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.18)', icon: 'rgba(74,222,128,0.1)',   text: '#4ade80' },
  warning: { glow: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.18)', icon: 'rgba(251,191,36,0.1)',   text: '#fbbf24' },
  error:   { glow: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.18)',icon: 'rgba(248,113,113,0.1)',  text: '#f87171' },
};

export default function KpiCard({ title, value, subtitle, icon, color = 'primary', empty = false }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.primary;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${empty ? 'rgba(203,213,225,0.07)' : c.border}`,
        bgcolor: 'background.paper',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 32px ${empty ? 'transparent' : c.glow}`,
        },
      }}
    >
      {!empty && (
        <Box
          sx={{
            position: 'absolute',
            top: -20, left: -20,
            width: 80, height: 80,
            borderRadius: '50%',
            background: c.glow,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
      )}
      <CardContent sx={{ p: 3, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                mb: 1.5,
              }}
            >
              {title}
            </Typography>

            {empty ? (
              <Box>
                <Typography
                  sx={{ fontSize: '1.8rem', fontWeight: 700, color: 'text.disabled', letterSpacing: '-0.03em', lineHeight: 1 }}
                >
                  —
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', mt: 0.8, fontWeight: 500 }}>
                  No data
                </Typography>
              </Box>
            ) : (
              <>
                <Typography
                  sx={{ fontSize: '2.2rem', fontWeight: 700, color: 'text.primary', letterSpacing: '-0.03em', lineHeight: 1 }}
                >
                  {value}
                </Typography>
                {subtitle && (
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.8, fontWeight: 500 }}>
                    {subtitle}
                  </Typography>
                )}
              </>
            )}
          </Box>

          <Box
            sx={{
              width: 44, height: 44,
              borderRadius: 2.5,
              background: empty ? 'rgba(203,213,225,0.04)' : c.icon,
              border: `1px solid ${empty ? 'rgba(203,213,225,0.08)' : c.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: empty ? 'text.disabled' : c.text,
              flexShrink: 0,
              '& svg': { fontSize: 22 },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
