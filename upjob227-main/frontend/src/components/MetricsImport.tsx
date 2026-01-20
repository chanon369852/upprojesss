import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { bulkCreateMetrics, createCampaign } from '../services/api';

type FormState = {
  startDate: string;
  endDate: string;
  platform: string;
  source: string;
  impressions: string;
  clicks: string;
  conversions: string;
  spend: string;
  revenue: string;
  mode: 'daily_range' | 'single_day';
};

const toInt = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.round(n));
};

const toFloat = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  return n;
};

const daysBetweenInclusive = (startIso: string, endIso: string): string[] => {
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (start > end) return [];

  const out: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    out.push(cursor.toISOString().slice(0, 10));
  }
  return out;
};

const MetricsImport: React.FC = () => {
  const navigate = useNavigate();

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }, []);

  const [form, setForm] = useState<FormState>({
    startDate: defaultStart,
    endDate: todayIso,
    platform: 'facebook',
    source: 'manual',
    impressions: '0',
    clicks: '0',
    conversions: '0',
    spend: '0',
    revenue: '0',
    mode: 'daily_range',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGenerateDemo = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const end = new Date();
      end.setHours(0, 0, 0, 0);
      const start = new Date(end);
      start.setDate(start.getDate() - 4);

      const dates: string[] = [];
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        dates.push(cursor.toISOString().slice(0, 10));
      }

      const platforms = [
        'facebook',
        'google',
        'google_ads',
        'tiktok',
        'line_ads',
        'ga4',
        'google_search_console',
        'shopee',
        'lazada',
        'instagram',
      ];

      const rows: Array<{
        date: string;
        platform: string;
        source: string;
        hour: number;
        campaignId: null;
        impressions: number;
        clicks: number;
        conversions: number;
        spend: number;
        revenue: number;
      }> = [];

      for (let i = 0; i < 10; i += 1) {
        const platform = platforms[i] || `platform_${i + 1}`;
        const source = `demo_set_${i + 1}`;

        for (let d = 0; d < dates.length; d += 1) {
          const base = 1000 + i * 350 + d * 180;
          const impressions = base * 40;
          const clicks = Math.max(50, Math.round(impressions * (0.012 + i * 0.0008)));
          const conversions = Math.max(2, Math.round(clicks * (0.03 + (d % 3) * 0.005)));
          const spend = Math.round((base * (2.2 + i * 0.15 + d * 0.08)) * 100) / 100;
          const revenue = Math.round((spend * (2.4 + (i % 4) * 0.35)) * 100) / 100;

          rows.push({
            date: `${dates[d]}T00:00:00.000Z`,
            platform,
            source,
            hour: 0,
            campaignId: null,
            impressions,
            clicks,
            conversions,
            spend,
            revenue,
          });
        }
      }

      const res = await bulkCreateMetrics(rows);

      setForm((prev) => ({
        ...prev,
        startDate: dates[0] || prev.startDate,
        endDate: dates[dates.length - 1] || prev.endDate,
        mode: 'daily_range',
      }));

      setSuccess(`Generated demo dataset: ${res?.created?.count ?? 0} records (10 sets × ${dates.length} days).`);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Generate demo dataset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFullDataset = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const end = new Date();
      end.setHours(0, 0, 0, 0);
      const start = new Date(end);
      start.setDate(start.getDate() - 4);

      const dates: string[] = [];
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        dates.push(cursor.toISOString().slice(0, 10));
      }

      const platforms = ['facebook', 'google', 'line', 'tiktok', 'shopee'];

      const createdCampaigns: Array<{ id: string; platform: string; setIndex: number }> = [];

      // 10 campaigns = 2 per platform
      for (let i = 0; i < 10; i += 1) {
        const platform = platforms[i % platforms.length];
        const setIndex = i + 1;

        // Unique externalId per tenant+platform, to avoid @@unique([tenantId, platform, externalId]) collisions
        const externalId = `demo_${platform}_${setIndex}_${Date.now()}`;

        const campaign = await createCampaign({
          name: `Demo Campaign ${setIndex} (${platform})`,
          platform,
          externalId,
          status: 'active',
          currency: 'THB',
        });

        createdCampaigns.push({ id: campaign.id, platform, setIndex });
      }

      const metricRows: Array<{
        date: string;
        platform: string;
        source: string;
        hour: number;
        campaignId: string;
        impressions: number;
        clicks: number;
        conversions: number;
        spend: number;
        revenue: number;
      }> = [];

      for (const c of createdCampaigns) {
        for (let d = 0; d < dates.length; d += 1) {
          const base = 800 + c.setIndex * 220 + d * 160;
          const impressions = base * 35;
          const clicks = Math.max(30, Math.round(impressions * (0.01 + (c.setIndex % 5) * 0.001)));
          const conversions = Math.max(1, Math.round(clicks * (0.025 + (d % 3) * 0.006)));
          const spend = Math.round((base * (1.9 + (c.setIndex % 4) * 0.25 + d * 0.07)) * 100) / 100;
          const revenue = Math.round((spend * (2.2 + (c.setIndex % 3) * 0.4)) * 100) / 100;

          metricRows.push({
            date: `${dates[d]}T00:00:00.000Z`,
            platform: c.platform,
            source: 'demo_full',
            hour: 0,
            campaignId: c.id,
            impressions,
            clicks,
            conversions,
            spend,
            revenue,
          });
        }
      }

      const res = await bulkCreateMetrics(metricRows);

      setForm((prev) => ({
        ...prev,
        startDate: dates[0] || prev.startDate,
        endDate: dates[dates.length - 1] || prev.endDate,
        mode: 'daily_range',
        platform: 'facebook',
        source: 'demo_full',
      }));

      setSuccess(
        `Generated full dataset: ${createdCampaigns.length} campaigns + ${res?.created?.count ?? 0} metrics records (${dates.length} days).`
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Generate full dataset failed');
    } finally {
      setLoading(false);
    }
  };

  const plannedDates = useMemo(() => {
    if (form.mode === 'single_day') {
      return form.startDate ? [form.startDate] : [];
    }
    return daysBetweenInclusive(form.startDate, form.endDate);
  }, [form.endDate, form.mode, form.startDate]);

  const previewCount = plannedDates.length;

  const handleChange = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!form.platform.trim()) {
        setError('Platform is required');
        return;
      }
      if (!plannedDates.length) {
        setError('Please select a valid date (or date range)');
        return;
      }

      const impressions = toInt(form.impressions) ?? 0;
      const clicks = toInt(form.clicks) ?? 0;
      const conversions = toInt(form.conversions) ?? 0;
      const spend = toFloat(form.spend) ?? 0;
      const revenue = toFloat(form.revenue) ?? 0;

      const platform = form.platform.trim();
      const source = (form.source || 'manual').trim();

      const rows = plannedDates.map((d) => ({
        date: `${d}T00:00:00.000Z`,
        platform,
        source,
        hour: 0,
        campaignId: null as any,
        impressions,
        clicks,
        conversions,
        spend,
        revenue,
      }));

      const res = await bulkCreateMetrics(rows);
      setSuccess(`Imported ${res?.created?.count ?? 0} records.`);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Import Metrics</h2>
            <p className="text-sm text-gray-500">
              Manually input metrics into the database so the dashboard can display non-zero values.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Input</CardTitle>
            <CardDescription>Choose platform + date range, then enter metrics values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Mode</span>
                <select
                  value={form.mode}
                  onChange={(e) => handleChange({ mode: e.target.value as FormState['mode'] })}
                  disabled={loading}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="daily_range">Daily range (one row per day)</option>
                  <option value="single_day">Single day</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Start date</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange({ startDate: e.target.value })}
                  disabled={loading}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">End date</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => handleChange({ endDate: e.target.value })}
                  disabled={loading || form.mode === 'single_day'}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Platform</span>
                <select
                  value={form.platform}
                  onChange={(e) => handleChange({ platform: e.target.value })}
                  disabled={loading}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="facebook">facebook</option>
                  <option value="google">google</option>
                  <option value="google_ads">google_ads</option>
                  <option value="tiktok">tiktok</option>
                  <option value="line_ads">line_ads</option>
                  <option value="ga4">ga4</option>
                  <option value="google_search_console">google_search_console</option>
                  <option value="shopee">shopee</option>
                  <option value="lazada">lazada</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Source (optional)</span>
                <input
                  value={form.source}
                  onChange={(e) => handleChange({ source: e.target.value })}
                  disabled={loading}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  placeholder="manual"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Impressions</span>
                <input
                  value={form.impressions}
                  onChange={(e) => handleChange({ impressions: e.target.value })}
                  disabled={loading}
                  inputMode="numeric"
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Clicks</span>
                <input
                  value={form.clicks}
                  onChange={(e) => handleChange({ clicks: e.target.value })}
                  disabled={loading}
                  inputMode="numeric"
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Conversions</span>
                <input
                  value={form.conversions}
                  onChange={(e) => handleChange({ conversions: e.target.value })}
                  disabled={loading}
                  inputMode="numeric"
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Spend</span>
                <input
                  value={form.spend}
                  onChange={(e) => handleChange({ spend: e.target.value })}
                  disabled={loading}
                  inputMode="decimal"
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Revenue</span>
                <input
                  value={form.revenue}
                  onChange={(e) => handleChange({ revenue: e.target.value })}
                  disabled={loading}
                  inputMode="decimal"
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">Preview</span>
                  <Badge variant="outline">{previewCount} rows</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleGenerateDemo} disabled={loading}>
                    {loading ? 'Generating…' : 'Generate demo (10×5)'}
                  </Button>
                  <Button variant="outline" onClick={handleGenerateFullDataset} disabled={loading}>
                    {loading ? 'Generating…' : 'Generate full (campaigns+metrics)'}
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Importing…' : 'Import now'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                This will create metrics rows with hour=0 and source={form.source || 'manual'}. Duplicate rows are skipped.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricsImport;
