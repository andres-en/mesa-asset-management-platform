'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/es';
import { createAppTheme } from './theme';

const ThemeModeContext = createContext({ mode: 'dark', toggleMode: () => {} });

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export default function ThemeRegistry({ children }) {
  const [mode, setMode] = useState('dark');

  // Leer preferencia guardada al montar
  useEffect(() => {
    const saved = localStorage.getItem('mesa-theme');
    if (saved === 'light' || saved === 'dark') setMode(saved);
  }, []);

  function toggleMode() {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('mesa-theme', next);
      return next;
    });
  }

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <CssBaseline />
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
