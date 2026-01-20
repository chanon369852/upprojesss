import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { getDashboardMetrics, getMetricsPlatformBreakdown } from '../services/api';
import type { DashboardMetricPoint } from '../types/api';

type Period = '24h' | '7d' | '30d' | '90d' | '365d';

const MetricsPage: React.FC = () => {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [series, setSeries] = useState<DashboardMetricPoint[]>([]);
  const [platformBreakdown, setPlatformBreakdown] = useState<
    Array<{ platform: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number }>
  >([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [s, pb] = await Promise.all([
        getDashboardMetrics(period),
        getMetricsPlatformBreakdown({ period }),
      ]);

      setSeries(Array.isArray(s) ? s : []);
      setPlatformBreakdown(Array.isArray(pb) ? pb : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load metrics');
      setSeries([]);
      setPlatformBreakdown([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    return series.reduce(
      (acc, p) => ({
        impressions: acc.impressions + (p.impressions || 0),
        clicks: acc.clicks + (p.clicks || 0),
        conversions: acc.conversions + (p.conversions || 0),
        spend: acc.spend + Number(p.spend || 0),
        revenue: acc.revenue + Number(p.revenue || 0),
      }),
      { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 }
    );
  }, [series]);

  return (
    <div className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Metrics</h2>
            <p className="text-sm text-gray-500">Metrics and analytics</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/metrics-import')}>
              Import Metrics
            </Button>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Period</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            disabled={loading}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
            <option value="365d">365d</option>
          </select>
          <Badge variant="outline">{series.length} points</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Totals</CardTitle>
              <CardDescription>Aggregated totals for selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500">Impressions</div>
                    <div className="font-semibold">{totals.impressions.toLocaleString('en-US')}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500">Clicks</div>
                    <div className="font-semibold">{totals.clicks.toLocaleString('en-US')}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500">Conversions</div>
                    <div className="font-semibold">{totals.conversions.toLocaleString('en-US')}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500">Spend</div>
                    <div className="font-semibold">{totals.spend.toLocaleString('en-US')}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500">Revenue</div>
                    <div className="font-semibold">{totals.revenue.toLocaleString('en-US')}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform breakdown</CardTitle>
              <CardDescription>Aggregated by platform</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : platformBreakdown.length === 0 ? (
                <div className="text-sm text-gray-500">No data.</div>
              ) : (
                <div className="space-y-2">
                  {platformBreakdown.slice(0, 10).map((row) => (
                    <div key={row.platform} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.platform}</Badge>
                        <span className="text-xs text-gray-500">rev {row.revenue.toLocaleString('en-US')}</span>
                      </div>
                      <div className="text-xs text-gray-600">imp {row.impressions.toLocaleString('en-US')}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Series</CardTitle>
            <CardDescription>Daily aggregated series</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : series.length === 0 ? (
              <div className="text-sm text-gray-500">No data.</div>
            ) : (
              <div className="space-y-2">
                {series.slice(-14).map((p) => (
                  <div key={p.date} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                    <div className="text-sm font-semibold text-gray-900">{p.date}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>imp {Number(p.impressions || 0).toLocaleString('en-US')}</span>
                      <span>clk {Number(p.clicks || 0).toLocaleString('en-US')}</span>
                      <span>conv {Number(p.conversions || 0).toLocaleString('en-US')}</span>
                      <span>rev {Number(p.revenue || 0).toLocaleString('en-US')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricsPage;
