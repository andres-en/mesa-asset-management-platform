'use client';

import { Box } from '@mui/material';
import { useThemeMode } from '@/theme/ThemeRegistry';
import MicroSlats from './MicroSlats';

export default function AppBackground() {
  const { mode } = useThemeMode();
  const dark = mode === 'dark';

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        bgcolor: dark ? '#0F172A' : '#F1F5F9',
      }}
    >
      <MicroSlats
        preset="tide"
        color={dark ? '#0f172a' : '#e2e8f0'}
        glintColor={dark ? '#4C9BF5' : '#1176EF'}
        backgroundColor={dark ? '#0f172a' : '#F1F5F9'}
        slatWidth={10}
        slatHeight={25}
        gap={3}
        roundness={0.75}
        glint={0.5}
        interactive={false}
        cursorStrength={0.6}
        intro
      />
    </Box>
  );
}
