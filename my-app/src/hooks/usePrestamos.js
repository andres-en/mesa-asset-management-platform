'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export function usePrestamos(endpoint = '/prestamos') {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrestamos = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await api.get(endpoint);
      setPrestamos(data);
    } catch (e) {
      setError(e.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchPrestamos(true);
  }, [fetchPrestamos]);

  return { prestamos, loading, error, refetch: fetchPrestamos };
}
