'use client';

import { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import AppBackground from '@/components/ui/AppBackground';

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBackground />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box
        component="main"
        sx={{
          position: 'relative',
          zIndex: 1,
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: { md: `${SIDEBAR_WIDTH}px` },
          width: { xs: '100%', md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          overflowX: 'hidden',
        }}
      >
        {/* Botón hamburguesa solo en mobile */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, p: 1 }}>
          <IconButton onClick={() => setMobileOpen(true)} size="small" sx={{ color: 'text.secondary' }}>
            <MenuIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
