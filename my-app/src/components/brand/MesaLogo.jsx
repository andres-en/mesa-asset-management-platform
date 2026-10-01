'use client';

import { Box } from '@mui/material';
import { useThemeMode } from '@/theme/ThemeRegistry';

/**
 * Mesa brand mark. Picks the artwork that contrasts with the current theme:
 * navy lettering on light backgrounds, white lettering on dark ones.
 *
 * variant: 'full' (isotype + wordmark + tagline) | 'icon' (isotype only)
 */
export default function MesaLogo({ variant = 'full', height = 40, sx }) {
  const { mode } = useThemeMode();
  const tone = mode === 'dark' ? 'light' : 'dark';
  const src = variant === 'icon' ? `/mesa-icon-${tone}.png` : `/mesa-logo-${tone}.png`;

  return (
    <Box
      component="img"
      src={src}
      alt="Mesa — Asset Management Platform"
      sx={{ height, width: 'auto', display: 'block', flexShrink: 0, ...sx }}
    />
  );
}
