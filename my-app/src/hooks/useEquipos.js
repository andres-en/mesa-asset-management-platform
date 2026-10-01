'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export function useEquipos() {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEquipos = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await api.get('/equipos');
      setEquipos(data);
    } catch (e) {
      setError(e.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipos(true);
  }, [fetchEquipos]);

  return { equipos, loading, error, refetch: fetchEquipos };
}
