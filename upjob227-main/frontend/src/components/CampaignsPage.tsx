import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { getCampaigns } from '../services/api';
import type { Campaign } from '../types/api';

const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Campaign[]>([]);

  const [platform, setPlatform] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCampaigns({ ...(platform ? { platform } : {}), page: 1, limit: 50 });
      setItems(Array.isArray(res?.campaigns) ? res.campaigns : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load campaigns');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = useMemo(() => items.length, [items.length]);

  return (
    <div className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Campaigns</h2>
            <p className="text-sm text-gray-500">Campaign management</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
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

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Campaign list</CardTitle>
                <CardDescription>Showing up to 50 campaigns</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{total} items</Badge>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={loading}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="">All platforms</option>
                  <option value="facebook">facebook</option>
                  <option value="google">google</option>
                  <option value="line">line</option>
                  <option value="tiktok">tiktok</option>
                  <option value="shopee">shopee</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-gray-500">No campaigns found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">ID: {c.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{c.platform}</Badge>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                      External: {c.externalId || '-'}
                    </div>
                    {Array.isArray(c.metrics) && c.metrics.length ? (
                      <div className="mt-3 text-xs text-gray-600">Recent metrics: {c.metrics.length} rows</div>
                    ) : (
                      <div className="mt-3 text-xs text-gray-400">Recent metrics: -</div>
                    )}
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

export default CampaignsPage;
