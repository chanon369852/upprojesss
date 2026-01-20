import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { RefreshCw, Play, History, CheckCircle2, XCircle } from 'lucide-react';
import type { Integration } from '../types/api';
import { getIntegrations, runPipeline, syncAllIntegrations, syncIntegration } from '../services/api';

type SyncOutcome = {
  provider: string;
  ok: boolean;
  integrationId?: string;
  mode?: string;
  durationMs?: number;
  error?: string;
};

const SyncCenter: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [rowSyncing, setRowSyncing] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<SyncOutcome[]>([]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultStartIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  }, []);
  const [pipelineStart, setPipelineStart] = useState(defaultStartIso);
  const [pipelineEnd, setPipelineEnd] = useState(todayIso);
  const [pipelineForce, setPipelineForce] = useState(false);

  const activeIntegrations = useMemo(
    () => integrations.filter((i) => i?.isActive),
    [integrations]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getIntegrations();
      setIntegrations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleProvider = useCallback((provider: string) => {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedProviders(new Set(activeIntegrations.map((i) => i.provider)));
  }, [activeIntegrations]);

  const clearSelection = useCallback(() => {
    setSelectedProviders(new Set());
  }, []);

  const runBulkSync = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);
      setResults([]);

      const providers = Array.from(selectedProviders);
      const response = await syncAllIntegrations(providers.length ? providers : undefined);

      const nextResults: SyncOutcome[] = Array.isArray(response?.results)
        ? response.results.map((r: any) => ({
            provider: String(r.provider || r?.result?.provider || 'unknown'),
            ok: Boolean(r.ok ?? (r?.result?.status !== 'error')),
            integrationId: r.integrationId,
            error: r.error,
          }))
        : [];

      setResults(nextResults);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [load, selectedProviders]);

  const runPipelineSync = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);
      setResults([]);

      const providers = Array.from(selectedProviders);
      const response = await runPipeline({
        ...(providers.length ? { providers } : {}),
        forceSync: pipelineForce,
        dateRange: pipelineStart && pipelineEnd ? { start: pipelineStart, end: pipelineEnd } : undefined,
      });

      const nextResults: SyncOutcome[] = Array.isArray(response?.results)
        ? response.results.map((r: any) => ({
            provider: String(r.provider || 'unknown'),
            ok: String(r.status || '').toLowerCase() === 'success',
            integrationId: r.integrationId,
            durationMs: typeof r.duration === 'number' ? r.duration : undefined,
            error: r.error,
          }))
        : [];

      setResults(nextResults);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Pipeline run failed');
    } finally {
      setSyncing(false);
    }
  }, [load, pipelineEnd, pipelineForce, pipelineStart, selectedProviders]);

  const runRowSync = useCallback(
    async (integration: Integration) => {
      const id = integration.id;
      if (!id) return;
      try {
        setRowSyncing((prev) => ({ ...prev, [id]: true }));
        setError(null);
        const res = await syncIntegration(id);
        setResults((prev) => [
          {
            provider: String(res?.provider || integration.provider),
            ok: true,
            integrationId: id,
            mode: res?.mode,
            durationMs: res?.durationMs,
          },
          ...prev,
        ]);
        await load();
      } catch (e: any) {
        const message = e?.response?.data?.message || e?.message || 'Sync failed';
        setResults((prev) => [
          {
            provider: integration.provider,
            ok: false,
            integrationId: id,
            error: message,
          },
          ...prev,
        ]);
      } finally {
        setRowSyncing((prev) => ({ ...prev, [id]: false }));
      }
    },
    [load]
  );

  return (
    <div className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Sync Center</h2>
            <p className="text-sm text-gray-500">
              Trigger data sync from connected platforms into the database. Every run is recorded in History.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/history')}
            >
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
            <Button variant="outline" onClick={load} disabled={loading || syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connected Integrations</CardTitle>
            <CardDescription>Select providers, then run Sync now. (Only active integrations are shown.)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} disabled={!activeIntegrations.length || syncing}>
                Select all
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection} disabled={!selectedProviders.size || syncing}>
                Clear
              </Button>
              <Button
                onClick={runBulkSync}
                disabled={syncing || loading || !activeIntegrations.length}
              >
                <Play className={`h-4 w-4 mr-2 ${syncing ? 'animate-pulse' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync now'}
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">Pipeline options</p>
                  <p className="text-xs text-gray-500">Run /pipeline/run with optional date range and force sync.</p>
                </div>
                <Button onClick={runPipelineSync} disabled={syncing || loading || !activeIntegrations.length}>
                  <Play className={`h-4 w-4 mr-2 ${syncing ? 'animate-pulse' : ''}`} />
                  {syncing ? 'Running…' : 'Run pipeline'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Start date</span>
                  <input
                    type="date"
                    value={pipelineStart}
                    onChange={(e) => setPipelineStart(e.target.value)}
                    disabled={syncing}
                    className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">End date</span>
                  <input
                    type="date"
                    value={pipelineEnd}
                    onChange={(e) => setPipelineEnd(e.target.value)}
                    disabled={syncing}
                    className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <input
                    type="checkbox"
                    checked={pipelineForce}
                    onChange={(e) => setPipelineForce(e.target.checked)}
                    disabled={syncing}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800">Force sync</span>
                </label>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 text-gray-700">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading integrations…</span>
              </div>
            ) : activeIntegrations.length === 0 ? (
              <div className="text-sm text-gray-500">No active integrations found. Configure integrations first.</div>
            ) : (
              <div className="space-y-2">
                {activeIntegrations.map((integration) => {
                  const checked = selectedProviders.has(integration.provider);
                  const isRowSyncing = Boolean(rowSyncing[integration.id]);
                  return (
                    <div
                      key={integration.id}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProvider(integration.provider)}
                          disabled={syncing}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 truncate">{integration.name || integration.provider}</p>
                            <Badge variant="outline">{integration.provider}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Last sync: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runRowSync(integration)}
                          disabled={syncing || isRowSyncing}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isRowSyncing ? 'animate-spin' : ''}`} />
                          Sync provider
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Latest Results</CardTitle>
            <CardDescription>Summary of the most recent manual runs from this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.length === 0 ? (
              <div className="text-sm text-gray-500">No runs yet.</div>
            ) : (
              results.slice(0, 20).map((r, idx) => (
                <div key={`${r.provider}-${idx}`} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {r.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">{r.provider}</span>
                      {r.integrationId ? <span className="text-xs text-gray-500">({r.integrationId})</span> : null}
                    </div>
                    {r.error ? <div className="text-xs text-rose-600 mt-1">{r.error}</div> : null}
                    {typeof r.durationMs === 'number' ? (
                      <div className="text-xs text-gray-500 mt-1">Duration: {Math.round(r.durationMs)} ms</div>
                    ) : null}
                  </div>
                  <Badge className={r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}>
                    {r.ok ? 'success' : 'error'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SyncCenter;
