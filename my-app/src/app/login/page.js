'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/theme/ThemeRegistry';
import MesaLogo from '@/components/brand/MesaLogo';
import { BASE_URL } from '@/services/api';
import {
  Box, Typography, Button, Divider,
  CircularProgress, Chip, IconButton, Tooltip,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon  from '@mui/icons-material/DarkMode';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const IS_DEV = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';

function LoginPageContent() {
  const { user, loading, loginWithGoogle, devLogin } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState(() => {
    const e = searchParams.get('error');
    return e ? decodeURIComponent(e) : null;
  });
  const dark = mode === 'dark';

  async function handleGoogleLogin() {
    setAuthLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/auth/google`);
      if (!res.ok) throw new Error('Could not sign in with Google');
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  function handleDevLogin() {
    devLogin();
    router.replace('/dashboard');
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      bgcolor: 'background.default',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Fondo decorativo */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: dark
          ? 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(17,118,239,0.18) 0%, transparent 60%)'
          : 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(17,118,239,0.12) 0%, transparent 60%)',
      }} />
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '40%', pointerEvents: 'none',
        background: dark
          ? 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(16,160,232,0.06) 0%, transparent 70%)'
          : 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(17,118,239,0.05) 0%, transparent 70%)',
      }} />

      {/* Toggle tema */}
      <Tooltip title={dark ? 'Light mode' : 'Dark mode'} arrow>
        <IconButton
          onClick={toggleMode}
          size="small"
          sx={{ position: 'absolute', top: 20, right: 20, color: 'text.secondary' }}
        >
          {dark ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
        </IconButton>
      </Tooltip>

      <Box sx={{ m: 'auto', width: '100%', maxWidth: 400, px: 3 }}>

        {/* Logo */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <MesaLogo height={72} />
        </Box>

        {/* Card */}
        <Box sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: dark
            ? '0 0 0 1px rgba(203,213,225,0.04), 0 32px 64px rgba(0,0,0,0.35)'
            : '0 0 0 1px rgba(15,23,42,0.05), 0 32px 64px rgba(15,23,42,0.12)',
        }}>

          {/* Franja superior decorativa */}
          <Box sx={{
            height: 4,
            background: 'linear-gradient(90deg, #1176EF 0%, #4C9BF5 50%, #10A0E8 100%)',
          }} />

          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            {/* Encabezado */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 2,
                bgcolor: dark ? 'rgba(17,118,239,0.15)' : 'rgba(17,118,239,0.08)',
                border: '1px solid',
                borderColor: dark ? 'rgba(17,118,239,0.25)' : 'rgba(17,118,239,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LockOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.2 }}>
                  Corporate access
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Authorized organization accounts only
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Botón Google */}
            {authLoading ? (
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
                py: 1.5, borderRadius: 2,
                border: '1px solid', borderColor: 'divider',
                color: 'text.secondary',
              }}>
                <CircularProgress size={18} sx={{ color: 'primary.main' }} />
                <Typography variant="body2" fontWeight={500} sx={{ color: 'text.secondary' }}>
                  Signing in…
                </Typography>
              </Box>
            ) : (
              <Box sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
              }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontSize: '0.65rem' }}>
                  Continue with
                </Typography>
                <Button
                  onClick={handleGoogleLogin}
                  variant="outlined"
                  fullWidth
                  sx={{
                    py: 1.25,
                    borderRadius: 10,
                    borderColor: dark ? 'rgba(203,213,225,0.2)' : 'rgba(15,23,42,0.15)',
                    color: 'text.primary',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    gap: 1.5,
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: dark ? 'rgba(17,118,239,0.06)' : 'rgba(17,118,239,0.04)',
                    },
                  }}
                >
                  <Box component="img"
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    sx={{ width: 20, height: 20 }}
                  />
                  Continue with Google
                </Button>
              </Box>
            )}

            {/* Error */}
            {error && (
              <Box sx={{
                mt: 2.5, p: 1.5, borderRadius: 2,
                bgcolor: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <Typography variant="caption" sx={{ color: 'error.main', display: 'block', textAlign: 'center' }}>
                  {error}
                </Typography>
              </Box>
            )}

            {/* Dev bypass */}
            {IS_DEV && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }}>
                  <Chip
                    label="dev only"
                    size="small"
                    sx={{ fontSize: '0.65rem', color: 'text.disabled', bgcolor: 'transparent', border: '1px solid', borderColor: 'divider' }}
                  />
                </Divider>
                <Button
                  fullWidth variant="outlined" onClick={handleDevLogin}
                  sx={{
                    borderColor: 'rgba(251,191,36,0.3)', color: 'warning.main',
                    fontSize: '0.85rem', py: 1.2,
                    '&:hover': { borderColor: 'rgba(251,191,36,0.55)', bgcolor: 'rgba(251,191,36,0.04)' },
                  }}
                >
                  Sign in without backend (dev)
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.disabled' }}>
          Access restricted to the IT department
        </Typography>
      </Box>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
