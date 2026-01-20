import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { getAiInsights } from '../services/api';
import type { AiInsight } from '../types/api';

const AiPage: React.FC = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AiInsight[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAiInsights({
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      });
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load AI insights');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [priority, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = useMemo(() => items.length, [items.length]);

  return (
    <div className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">AI</h2>
            <p className="text-sm text-gray-500">AI features</p>
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

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Status</span>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={loading}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            placeholder="open / actioned / dismissed"
          />
          <span className="text-sm text-gray-600">Priority</span>
          <input
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={loading}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            placeholder="low / medium / high"
          />
          <Badge variant="outline">{total} items</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insights</CardTitle>
            <CardDescription>Data-driven suggestions stored in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-gray-500">No insights found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((ins) => (
                  <div key={ins.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{ins.title}</div>
                        <div className="text-xs text-gray-500">ID: {ins.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ins.priority ? <Badge variant="outline">{ins.priority}</Badge> : null}
                        {ins.status ? <Badge variant="secondary">{ins.status}</Badge> : null}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">{ins.description || '-'}</div>
                    <div className="mt-1 text-xs text-gray-500">Campaign: {ins.campaign?.name || '-'}</div>
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

export default AiPage;
