import { Alert, Collapse } from '@mui/material';

/**
 * Alerta estándar de la app.
 * severity: 'error' | 'warning' | 'success' | 'info'
 * onClose: función opcional para hacer la alerta descartable
 */
export default function AppAlert({ severity = 'error', children, onClose, show = true, sx }) {
  return (
    <Collapse in={show} unmountOnExit>
      <Alert
        severity={severity}
        onClose={onClose}
        sx={{
          borderRadius: 2,
          fontSize: '0.875rem',
          alignItems: 'center',
          ...sx,
        }}
      >
        {children}
      </Alert>
    </Collapse>
  );
}
