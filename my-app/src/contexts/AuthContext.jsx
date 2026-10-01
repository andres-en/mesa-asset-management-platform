'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { api, BASE_URL } from '@/services/api';

const IS_DEV_LOGIN_ENABLED =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';

const DEV_USER = { id: 1, nombre: 'Dev IT Admin', correo: 'dev@mesa.local', rol: 'admin' };

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión al recargar: el JWT vive en una cookie HttpOnly que solo
  // el backend puede leer, así que la validez de la sesión se confirma contra /auth/me.
  useEffect(() => {
    fetch(`${BASE_URL}/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('session expired');
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    try { await api.post('/auth/logout'); } catch { /* red caída — continuar */ }
    setUser(null);
    window.location.href = '/login';
  }

  async function loginWithGoogle(googleCredential) {
    const res = await fetch(`${BASE_URL}/auth/callback`, {
      method:  'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code: googleCredential }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || 'Google authentication failed');
    }

    const data = await res.json();
    setUser(data);
  }

  function devLogin() {
    if (!IS_DEV_LOGIN_ENABLED) return;
    // Solo para desarrollo local sin backend: cookie no-HttpOnly que únicamente
    // sirve para pasar el gating del middleware. No autentica llamadas reales a la API.
    document.cookie = 'token=dev-token-local; path=/; SameSite=Lax';
    setUser(DEV_USER);
  }

  // Viewers are read-only: the API answers 403 to their writes, so the UI hides those actions.
  const isAdmin = user?.rol === 'admin';

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      <AuthContext.Provider value={{ user, isAdmin, loading, logout, loginWithGoogle, devLogin }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
