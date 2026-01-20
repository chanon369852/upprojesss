import { useEffect, useState, useCallback } from 'react';
import { CurrentUser } from '../types/api';
import { getCurrentUser } from '../services/api';

interface UseCurrentUserResult {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCurrentUser = (): UseCurrentUserResult => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = window.localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }
      const data = await getCurrentUser();
      if (data?.role) {
        try {
          window.localStorage.setItem('userRole', String(data.role));
        } catch {
          // ignore
        }
      }
      if ((data as any)?.tenantId) {
        try {
          window.localStorage.setItem('tenantId', String((data as any).tenantId));
          window.localStorage.removeItem('tenantSlug');
        } catch {
          // ignore
        }
      }
      setUser(data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Unable to load current user';
      setError(message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const token = window.localStorage.getItem('token');
    if (!token) return;

    const onFocus = () => {
      fetchUser();
    };

    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => {
      fetchUser();
    }, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [fetchUser]);

  return { user, loading, error, refetch: fetchUser };
};
