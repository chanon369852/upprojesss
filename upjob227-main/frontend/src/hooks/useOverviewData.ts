import { useState, useEffect } from 'react';
import {
    OverviewDashboardData,
    OverviewRealtimeMetric,
    AiSummaryMetric,
    FinancialOverviewData,
    ActiveCampaignMetric,
    ConversionPlatformMetric,
    LtvCacData,
    DashboardOverviewMeta,
    DashboardOverviewResponse
} from '../types/dashboard';
import { getDashboardOverview } from '../services/api';

// Data might need some adjustments to match the strict interfaces exactly
// This hook acts as an adapter/transformer

export const useOverviewData = (
    dateRange: string,
    compareMode: string,
    conversionConnectionStatus: any
) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<OverviewDashboardData | null>(null);
    const [meta, setMeta] = useState<DashboardOverviewMeta | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const run = async () => {
            try {
                const response = (await getDashboardOverview({
                    range: (dateRange === '30D' ? '30D' : dateRange === '7D' ? '7D' : 'Today') as any,
                })) as DashboardOverviewResponse;

                const base = ((response as any)?.data || {}) as OverviewDashboardData;
                const responseMeta = (((response as any)?.meta || null) as DashboardOverviewMeta | null) || null;

                const statusMap = (conversionConnectionStatus || {}) as Record<string, string>;

                const conversionPlatforms: ConversionPlatformMetric[] = (Array.isArray((base as any).conversionPlatforms)
                    ? (base as any).conversionPlatforms
                    : [])
                    .map((p: any) => {
                        const platform = String(p?.platform ?? '');
                        const key = Object.keys(statusMap).find(
                            (k) => k.toLowerCase().includes(platform.toLowerCase()) || platform.toLowerCase().includes(k.toLowerCase())
                        );
                        const isConnected = key ? statusMap[key] === 'connected' : String(p?.connectionStatus ?? 'connected') === 'connected';
                        return {
                            id: String(p?.id ?? platform),
                            platform,
                            value: Number(p?.value ?? 0),
                            color: String(p?.color ?? '#94a3b8'),
                            connectionStatus: isConnected ? 'connected' : 'disconnected',
                        } as ConversionPlatformMetric;
                    })
                    .filter((p) => p.connectionStatus === 'connected');

                const normalized: OverviewDashboardData = {
                    realtimeMessages: Array.isArray((base as any).realtimeMessages) ? (base as any).realtimeMessages : ([] as OverviewRealtimeMetric[]),
                    aiSummaries: Array.isArray((base as any).aiSummaries) ? (base as any).aiSummaries : ([] as AiSummaryMetric[]),
                    financial: ((base as any).financial || null) as FinancialOverviewData,
                    conversionFunnel: Array.isArray((base as any).conversionFunnel) ? (base as any).conversionFunnel : [],
                    activeCampaigns: Array.isArray((base as any).activeCampaigns) ? (base as any).activeCampaigns : ([] as ActiveCampaignMetric[]),
                    conversionPlatforms,
                    ltvCac: ((base as any).ltvCac || null) as LtvCacData,
                };

                if (!cancelled) {
                    setData(normalized);
                    setMeta(responseMeta);
                }
            } catch {
                if (!cancelled) {
                    setData(null);
                    setMeta(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [dateRange, compareMode, conversionConnectionStatus]);

    return { data, meta, loading };
};
