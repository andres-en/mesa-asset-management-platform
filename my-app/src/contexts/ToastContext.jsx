'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Slide, Box, Typography, IconButton } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlinedIcon      from '@mui/icons-material/ErrorOutlined';
import WarningAmberIcon       from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon       from '@mui/icons-material/InfoOutlined';
import CloseIcon              from '@mui/icons-material/Close';

const ToastContext = createContext(null);

function SlideLeft(props) {
  return <Slide {...props} direction="left" />;
}

const CONFIG = {
  success: { Icon: CheckCircleOutlineIcon, color: '#4ade80', border: 'rgba(74,222,128,0.25)' },
  error:   { Icon: ErrorOutlinedIcon,      color: '#f87171', border: 'rgba(248,113,113,0.25)' },
  warning: { Icon: WarningAmberIcon,       color: '#fbbf24', border: 'rgba(251,191,36,0.25)'  },
  info:    { Icon: InfoOutlinedIcon,       color: '#10A0E8', border: 'rgba(16,160,232,0.25)'  },
};

function ToastItem({ message, severity, onClose }) {
  const { Icon, color, border } = CONFIG[severity] ?? CONFIG.info;
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.25,
      minWidth: 280,
      maxWidth: 400,
      px: 1.75,
      py: 1.5,
      borderRadius: 2,
      bgcolor: 'rgba(15, 23, 42, 0.88)',
      border: `1px solid ${border}`,
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
    }}>
      <Icon sx={{ fontSize: 18, color, flexShrink: 0, mt: 0.1 }} />
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.90)', fontWeight: 500, lineHeight: 1.5, flex: 1, fontSize: '0.85rem' }}>
        {message}
      </Typography>
      <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.35)', p: 0.25, mt: -0.25, mr: -0.25, '&:hover': { color: 'rgba(255,255,255,0.7)', bgcolor: 'transparent' } }}>
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = useCallback((message, severity = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  function handleClose(_, reason) {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        slots={{ transition: SlideLeft }}
        sx={{ top: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 } }}
      >
        <span>
          <ToastItem message={toast.message} severity={toast.severity} onClose={handleClose} />
        </span>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
