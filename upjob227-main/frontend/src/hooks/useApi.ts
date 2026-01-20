import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardMetricPoint, Campaign } from '../types/api';
import { getCampaigns, getDashboardMetrics } from '../services/api';

export const useMetrics = (filters?: {
  startDate?: string;
  endDate?: string;
  platform?: string;
  period?: '24h' | '7d' | '30d' | '90d' | '365d';
}) => {
  const [metrics, setMetrics] = useState<DashboardMetricPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardMetrics({
        period: filters?.period,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      });

      // Note: backend currently returns aggregated daily series. Platform filtering is handled via separate endpoints.
      setMetrics(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load metrics');
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.endDate, filters?.period, filters?.startDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, filtersKey]);

  return { metrics, loading, error, refetch: fetchMetrics };
};

export const useCampaigns = (platform?: string) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCampaigns({ platform });
      setCampaigns(Array.isArray(response?.campaigns) ? response.campaigns : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return { campaigns, loading, error, refetch: fetchCampaigns };
};
