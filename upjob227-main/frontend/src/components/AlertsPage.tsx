import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { createAlert, getAlerts } from '../services/api';
import type { Alert as AlertType } from '../types/api';

const AlertsPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AlertType[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAlerts();
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load alerts');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = useMemo(() => items.length, [items.length]);

  const handleCreateSample = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await createAlert({
        name: `Demo Alert ${new Date().toISOString()}`,
        alertType: 'kpi',
        metric: 'revenue',
        operator: '>',
        threshold: 1000,
        recipients: [],
        notificationChannels: ['email'],
      });
      await fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Alerts</h2>
            <p className="text-sm text-gray-500">Alert management</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={handleCreateSample} disabled={loading}>
              Create sample
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
                <CardTitle className="text-lg">Alert list</CardTitle>
                <CardDescription>Rules configured in the system</CardDescription>
              </div>
              <Badge variant="outline">{total} items</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-gray-500">No alerts found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{a.name}</div>
                        <div className="text-xs text-gray-500">ID: {a.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{a.alertType}</Badge>
                        <Badge variant={a.isActive ? 'default' : 'secondary'}>{a.isActive ? 'active' : 'inactive'}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                      Metric: {a.metric} {a.operator} {a.threshold ?? '-'}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Campaign: {a.campaign?.name || '-'}</div>
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

export default AlertsPage;
