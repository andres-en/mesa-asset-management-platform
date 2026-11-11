'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export function useOficinas() {
  const [oficinas, setOficinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOficinas = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await api.get('/oficinas');
      setOficinas(data);
    } catch (e) {
      setError(e.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOficinas(true);
  }, [fetchOficinas]);

  return { oficinas, loading, error, refetch: fetchOficinas };
}
