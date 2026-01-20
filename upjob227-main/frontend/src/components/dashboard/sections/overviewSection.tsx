import React from 'react';
import { ArrowUpRight, Download, Loader2, TrendingUp } from 'lucide-react';
import SectionTitle from '../SectionTitle';
import { DashboardOverviewMeta, OverviewDashboardData } from '../../../types/dashboard';

type DownloadButtonProps = {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
  style?: React.CSSProperties;
};

const downloadPillStyle: React.CSSProperties = {
  color: 'var(--theme-text)',
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: 'transparent',
};

const accentHoverClass: Record<string, string> = {
  blue: 'group-hover:text-blue-500',
  emerald: 'group-hover:text-emerald-500',
  purple: 'group-hover:text-purple-500',
  orange: 'group-hover:text-orange-500',
  indigo: 'group-hover:text-indigo-500',
};

const deltaPillClass = (positive: boolean) =>
  positive
    ? 'bg-emerald-500/10 text-emerald-500'
    : 'bg-rose-500/10 text-rose-500';

const DownloadButton: React.FC<DownloadButtonProps> = ({
  title,
  onClick,
  disabled,
  className,
  iconClassName = 'h-3.5 w-3.5',
  style,
}) => (
  <button
    className={
      className ||
      'inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-all download-pill hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed'
    }
    style={style || downloadPillStyle}
    title={title}
    onClick={onClick}
    disabled={disabled}
  >
    <Download className={iconClassName} />
    Download
  </button>
);

export type OverviewSectionRefs = {
  integrations: React.RefObject<HTMLDivElement>;
  aiSummaries: React.RefObject<HTMLDivElement>;
  performance: React.RefObject<HTMLDivElement>;
  conversionsPlatform: React.RefObject<HTMLDivElement>;
};

export type OverviewSectionProps = {
  // Logic Props
  data: OverviewDashboardData | null;
  meta?: DashboardOverviewMeta | null;
  loading: boolean;
  platformRevenueBreakdown?: Array<{ name: string; value: number }>;
  platformRevenueLoading?: boolean;
  platformRevenueError?: string | null;

  // UI/Theme Props
  themePanelClass: string;
  themePanelCompactClass: string;
  overviewSectionRefs: OverviewSectionRefs;

  // Components Dependencies
  IntegrationChecklistWidget?: React.ComponentType<{ containerRef?: React.RefObject<HTMLDivElement> }>;
  ConnectionsInProgressWidget?: React.ComponentType;
  RealTimeCard: React.ComponentType<any>;
  DonutChart: React.ComponentType<any>;
  FunnelVisualizer: React.ComponentType<any>;
  ConversionPlatformBars: React.ComponentType<any>;
  LtvComparisonChart: React.ComponentType<any>;
  PlatformPieChart?: React.ComponentType<any>;

  // Interaction Handlers
  compareMode: 'previous' | 'target';
  selectedRange: 'Today' | '7D' | '30D';
  setSelectedRange: (value: 'Today' | '7D' | '30D') => void;
  setCompareMode: (value: 'previous' | 'target') => void;
  selectedRealtimeId: string;
  setSelectedRealtimeId: (id: string) => void;
  openDownloadModal: (title: string) => void;
  handleConversionsPlatformDownload: () => void;
  handleActiveCampaignMonitorDownload: () => void;

  // Legacy/Compatibility props
  conversionConnectionStatus: any;
  hasConnectedConversionPlatform: boolean;

  // Unused props but kept for interface compatibility if needed by parent (though should be cleaned up)
  TrendingUp?: React.ComponentType<any>;
};

const OverviewSection: React.FC<OverviewSectionProps> = ({
  data,
  meta,
  loading,
  platformRevenueBreakdown,
  platformRevenueLoading,
  platformRevenueError,
  IntegrationChecklistWidget,
  ConnectionsInProgressWidget,
  overviewSectionRefs,
  themePanelClass,
  themePanelCompactClass,
  RealTimeCard,
  compareMode,
  selectedRange,
  setSelectedRange,
  setCompareMode,
  selectedRealtimeId,
  setSelectedRealtimeId,
  openDownloadModal,
  DonutChart,
  FunnelVisualizer,
  handleConversionsPlatformDownload,
  handleActiveCampaignMonitorDownload,
  conversionConnectionStatus,
  ConversionPlatformBars,
  LtvComparisonChart,
  PlatformPieChart,
}) => {

  const ChecklistWidget = IntegrationChecklistWidget || ConnectionsInProgressWidget;

  // --- Loading State ---
  if (loading) {
    return (
      <div className="space-y-8 min-h-[600px] flex flex-col justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500/50" />
        <p className="text-sm font-medium text-gray-400 animate-pulse">Loading dashboard insights...</p>
      </div>
    );
  }

  // --- Empty State ---
  if (!data) {
    return (
      <div className="space-y-8 p-20 text-center">
        <p className="text-gray-400">Unable to load dashboard data.</p>
      </div>
    );
  }

  const activeRealtimeStat =
    data.realtimeMessages.find((stat) => stat.id === selectedRealtimeId) || data.realtimeMessages[0];

  const lastUpdatedAt = meta?.provenance?.lastUpdatedAt ? new Date(meta.provenance.lastUpdatedAt) : null;
  const minDate = meta?.provenance?.dataRange?.minDate ? new Date(meta.provenance.dataRange.minDate) : null;
  const maxDate = meta?.provenance?.dataRange?.maxDate ? new Date(meta.provenance.dataRange.maxDate) : null;

  return (
    <div className="space-y-10 pb-12">
      {/* Integration Checklist Widget */}
      {ChecklistWidget ? <ChecklistWidget /> : null}

      <section className={themePanelClass}>
        <div className="flex flex-col gap-6 mb-8">
          <SectionTitle title="Overview Dashboard" subtitle="Real-time marketing performance insights" />

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            <span className="uppercase text-gray-400">Data</span>
            <span>
              Last updated:{' '}
              <span className="font-semibold text-gray-800">
                {lastUpdatedAt ? lastUpdatedAt.toLocaleString() : '—'}
              </span>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              Data range:{' '}
              <span className="font-semibold text-gray-800">
                {minDate ? minDate.toISOString().slice(0, 10) : '—'}
              </span>
              {' '}to{' '}
              <span className="font-semibold text-gray-800">
                {maxDate ? maxDate.toISOString().slice(0, 10) : '—'}
              </span>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              Source:{' '}
              <span className="font-semibold text-gray-800">{meta?.provenance?.source?.table || '—'}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="uppercase text-gray-400">Range</span>
            {(['Today', '7D', '30D'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setSelectedRange(range)}
                className={
                  `rounded-full border px-3 py-1 font-semibold ${
                    selectedRange === range ? 'bg-gray-700 text-white border-gray-700' : 'border-gray-200 text-gray-700'
                  }`
                }
              >
                {range}
              </button>
            ))}

            <span className="ml-4 uppercase text-gray-400">Compare</span>
            {(['previous', 'target'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCompareMode(mode)}
                className={
                  `rounded-full border px-3 py-1 font-semibold capitalize ${
                    compareMode === mode ? 'bg-gray-700 text-white border-gray-700' : 'border-gray-200 text-gray-700'
                  }`
                }
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Real-Time Analytics */}
        <div className={`${themePanelClass} shadow-sm hover:shadow-md transition-shadow duration-300 p-6 rounded-xl`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold tracking-tight theme-text">Real-Time Analytics</h3>
              <p className="text-sm text-gray-500 mt-1">Monitors live marketing signals</p>
            </div>
            <p className="text-xs theme-muted">{activeRealtimeStat?.delta}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.realtimeMessages.map((stat) => (
              <RealTimeCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                delta={stat.delta}
                positive={stat.positive}
                active={stat.id === selectedRealtimeId}
                onSelect={() => setSelectedRealtimeId(stat.id)}
              />
            ))}
          </div>

          <div className="theme-panel-soft rounded-2xl border border-dashed border-gray-200 p-5 text-sm theme-muted flex flex-wrap gap-6 mt-6">
            <div className="space-y-1 min-w-[150px]">
              <p className="text-xs uppercase theme-muted">Focused metric</p>
              <p className="text-base font-semibold theme-text">{activeRealtimeStat?.label}</p>
            </div>
            <div className="space-y-1 min-w-[120px]">
              <p className="text-xs uppercase theme-muted">Range</p>
              <p className="text-base font-semibold theme-text">{selectedRange}</p>
            </div>
            <div className="space-y-1 min-w-[170px]">
              <p className="text-xs uppercase theme-muted">Comparison</p>
              <p className="text-base font-semibold theme-text">
                {compareMode === 'previous' ? 'Previous period' : 'Quarter target'}
              </p>
            </div>
          </div>
        </div>

        <div className={`${themePanelClass} shadow-sm hover:shadow-md transition-shadow duration-300 p-6 rounded-xl mt-8`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold tracking-tight theme-text">Revenue Share by Platform</h3>
              <p className="text-sm text-gray-500 mt-1">Platform mix based on revenue</p>
            </div>
          </div>

          {platformRevenueLoading ? (
            <div className="py-12 text-center text-sm theme-muted">Loading...</div>
          ) : platformRevenueError ? (
            <div className="py-12 text-center text-sm text-rose-500">{platformRevenueError}</div>
          ) : PlatformPieChart && Array.isArray(platformRevenueBreakdown) && platformRevenueBreakdown.length > 0 ? (
            <PlatformPieChart data={platformRevenueBreakdown} title="Revenue Share" />
          ) : (
            <div className="py-12 text-center text-sm theme-muted">No platform revenue data</div>
          )}
        </div>

        {/* 2. Key Metrics Cards (AI Summaries) */}
        <div
          ref={overviewSectionRefs.aiSummaries}
          className={`${themePanelClass} shadow-sm hover:shadow-md transition-shadow duration-300 p-6 rounded-xl mt-8 scroll-mt-28`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold tracking-tight theme-text">AI Summaries</h3>
              <p className="text-sm text-gray-500 mt-1">Core metrics efficiency</p>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.aiSummaries.map((metric) => (
              <div key={metric.id} className="theme-panel rounded-xl p-5 border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors ${
                      accentHoverClass[metric.accentColor || 'indigo'] || accentHoverClass.indigo
                    }`}
                  >
                    {metric.label}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${deltaPillClass(metric.positive)}`}>
                    {metric.delta}
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight theme-text mb-1">{metric.value}</p>
                <p className="text-xs text-gray-400">{metric.periodLabel}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Financial & Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className={`${themePanelClass} shadow-lg p-6 rounded-xl`}>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold flex items-center gap-2 theme-text">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block"></span>
                  Financial Overview
                </h3>
                <p className="text-sm font-medium text-gray-500 pl-3.5">
                  ROI <span className="text-indigo-500">{data.financial.roi}</span> <span className="text-xs text-gray-400">({data.financial.roiChange})</span>
                </p>
              </div>
              <DownloadButton title="Download financial overview" onClick={() => openDownloadModal('Financial Overview')} />
            </div>
            <div className="flex items-center justify-center py-4">
              <DonutChart segments={data.financial.breakdown} />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-6 text-center border-t border-gray-100 dark:border-gray-800 border-dashed">
              {data.financial.details.map((card: any) => (
                <div key={card.label} className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {card.label.replace('Total ', '')}
                  </p>
                  <p className="text-lg font-bold theme-text tracking-tight">
                    ${card.value.toLocaleString('en-US')}
                  </p>
                  <p className="text-xs font-medium" style={{ color: card.accent }}>
                    {card.delta}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-6 border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#0b1220] to-[#101a33] shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Conversion Funnel</h3>
                <p className="text-sm text-sky-200/80">User journey effectiveness</p>
              </div>
              <DownloadButton
                title="Download funnel data"
                onClick={() => openDownloadModal('User Conversion Funnel')}
                className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-all download-pill hover:bg-white/10"
                style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'transparent' }}
              />
            </div>
            <div className="py-2">
              <FunnelVisualizer steps={data.conversionFunnel} variant="dark" />
            </div>
          </div>
        </div>

        {/* 4. Active Campaign Monitor */}
        <div ref={overviewSectionRefs.performance} className={`${themePanelCompactClass} bg-white space-y-6 p-6 rounded-xl mt-8 border border-gray-100 scroll-mt-28`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold theme-text flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Active Campaign Monitor
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Real-time performance snapshot
              </p>
            </div>
            <DownloadButton
              title="Download CSV"
              onClick={() => handleActiveCampaignMonitorDownload()}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-white text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-4 px-6 text-left font-bold text-xs uppercase tracking-wider opacity-90">Campaign Name</th>
                  <th className="py-4 px-6 text-left font-bold text-xs uppercase tracking-wider opacity-90">Platform</th>
                  <th className="py-4 px-6 text-right font-bold text-xs uppercase tracking-wider opacity-90">Conversions</th>
                  <th className="py-4 px-6 text-right font-bold text-xs uppercase tracking-wider opacity-90">CPA</th>
                  <th className="py-4 px-6 text-right font-bold text-xs uppercase tracking-wider opacity-90">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.activeCampaigns.length > 0 ? (
                  data.activeCampaigns.map((campaign, idx) => (
                    <tr
                      key={campaign.id || idx}
                      className="group"
                    >
                      <td className="py-4 px-6 font-semibold text-gray-800">
                        {campaign.campaignName}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-[#1e293b] text-white text-xs font-medium border border-gray-600 shadow-sm">
                          {campaign.platform}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-gray-700">
                        {Number(campaign.conversions ?? 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-gray-600">
                        ${Number(campaign.cpa ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-gray-600">
                        ${Number(campaign.budget ?? 0).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                      No active campaigns found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>




        {/* 5. Conversions Platform & LTV:CAC */}
        < div className="flex flex-col lg:flex-row gap-8 mt-8" >
          <div
            ref={overviewSectionRefs.conversionsPlatform}
            className={`${themePanelClass} shadow-sm p-6 rounded-xl lg:basis-[40%] lg:max-w-[40%] scroll-mt-28`}
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold theme-text flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                  Conversions Platform
                </h3>
                <p className="text-sm text-gray-500">By platform breakdown</p>
              </div>
              <DownloadButton
                title="Download CSV"
                onClick={() => handleConversionsPlatformDownload()}
                disabled={data.conversionPlatforms.length === 0}
              />
            </div>

            {data.conversionPlatforms.length > 0 ? (
              <ConversionPlatformBars data={data.conversionPlatforms} connectionStatus={conversionConnectionStatus} />
            ) : (
              <div className="py-12 text-center text-sm theme-muted border-2 border-dashed border-gray-100 rounded-lg">
                Connect a platform to see data
              </div>
            )}
          </div>

          <div className={`${themePanelClass} p-6 rounded-xl shadow-sm space-y-6 lg:basis-[60%] lg:max-w-[60%]`}>
            <div className="w-full">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold theme-text">LTV : CAC Ratio</h3>
                <DownloadButton
                  title="Download Data"
                  onClick={() => openDownloadModal('LTV : CAC Ratio')}
                />
              </div>
              <LtvComparisonChart data={data.ltvCac.trend} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Current Ratio</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold theme-text">{data.ltvCac.currentRatio}x</p>
                    <span className="text-xs font-medium text-emerald-500 flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      {data.ltvCac.movement}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Avg. LTV</span>
                  <span className="font-bold theme-text">${data.ltvCac.avgLtv}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>

                <div className="flex justify-between text-sm mt-3 mb-1">
                  <span className="text-gray-500">Avg. CAC</span>
                  <span className="font-bold theme-text">${data.ltvCac.avgCac}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-orange-400 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed pt-2">
              <span className="font-semibold text-gray-500">Insight:</span> When the ratio stays above target, your acquisition budget is creating sustained lifetime value.
            </p>
          </div>
        </div >
      </section >
    </div >
  );
};

export default OverviewSection;
