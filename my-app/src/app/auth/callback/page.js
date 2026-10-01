'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

function AutenticandoFallback() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default', gap: 2 }}>
      <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Signing in…</Typography>
    </Box>
  );
}

function AuthCallbackContent() {
  const { loginWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    if (!code) {
      router.replace('/login');
      return;
    }

    loginWithGoogle(code)
      .then(() => router.replace('/dashboard'))
      .catch((err) => {
        const msg = encodeURIComponent(err.message || 'Authentication failed');
        router.replace(`/login?error=${msg}`);
      });
  }, []);

  return <AutenticandoFallback />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AutenticandoFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
