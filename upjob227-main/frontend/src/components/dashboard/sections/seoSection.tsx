import React, { useState } from 'react';
import { Download, Filter, RefreshCw, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Cell, Pie, PieChart, Sector, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import SectionTitle from '../SectionTitle';

type FilterOption = { key: string; label: string };

type SeoBlockKind =
  | 'kpi'
  | 'authority'
  | 'organicSummary'
  | 'visibility'
  | 'conversion'
  | 'issues'
  | 'keywords'
  | 'competitors'
  | 'positionDistribution'
  | 'backlinks'
  | 'competitiveMap'
  | 'regional'
  | 'technicalScores'
  | 'channelMix'
  | 'rightRail';

type SeoBlockPlacement = 'full' | 'main' | 'rail';

type SeoPageBlock = {
  id: string;
  kind: SeoBlockKind;
  placement: SeoBlockPlacement;
  title?: string;
  subtitle?: string;
};

type SeoPageRow = {
  id: string;
  columns: Array<Pick<SeoPageBlock, 'id' | 'kind'> & { span?: 1 | 2 | 3 }>;
};

type SeoPageSchema = {
  layout: {
    mainGapClass: string;
    gridClass: string;
    railClass: string;
  };
  fullWidthBlocks: SeoPageBlock[];
  mainRows: SeoPageRow[];
  railBlocks: SeoPageBlock[];
};

export type SeoSectionProps = {
  themedSectionClass: string;
  themePanelClass: string;
  filterOptions: ReadonlyArray<FilterOption>;
  seoDateRange: string;
  handleRefresh: () => void;
  seoFilterOpen: boolean;
  setSeoFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSeoDateRange: (value: string) => void;
  openDownloadModal: (title: string) => void;
  seoRealtimeStats: any[];
  RealTimeCard: React.ComponentType<any>;
  SeoAuthorityCard: React.ComponentType<any>;
  SeoOrganicSummaryCard: React.ComponentType<any>;
  SearchVisibilityCard: React.ComponentType<any>;
  seoSnapshots: any;
  SeoConversionCard: React.ComponentType<any>;
  seoConversionSummary: any;
  SeoIssuesCard: React.ComponentType<any>;
  seoIssues: any;
  SeoKeywordsTable: React.ComponentType<any>;
  seoKeywordsDetailed: any;
  SeoCompetitorsCard: React.ComponentType<any>;
  seoCompetitors: any;
  SeoPositionDistributionCard: React.ComponentType<any>;
  seoPositionDistribution: any;
  SeoBacklinkSummaryCard: React.ComponentType<any>;
  SeoCompetitiveMapCard: React.ComponentType<any>;
  seoCompetitiveMap: any;
  SeoRegionalPerformanceCard: React.ComponentType<any>;
  seoRegionalPerformance: any;
  TechnicalScoreList: React.ComponentType<any>;
  seoTechnicalScores: any;
  SeoChannelMix: React.ComponentType<any>;
  SeoRightRailCard: React.ComponentType<any>;
  seoAuthorityScores: any;
  seoBacklinkHighlights: any;
  seoOrganicSearch: any;
  seoAnchors: any;
  seoReferringDomains: any;
  seoRightRailStats: any;
  seoUrlRatings: any;
  seoSectionRefs: {
    overview: React.RefObject<HTMLDivElement>;
    regional: React.RefObject<HTMLDivElement>;
    competitors: React.RefObject<HTMLDivElement>;
  };
  themeMode?: 'light' | 'dark';
};

const SeoSection: React.FC<SeoSectionProps> = ({
  themeMode = 'light',
  themedSectionClass,
  themePanelClass,
  filterOptions,
  seoDateRange,
  handleRefresh,
  seoFilterOpen,
  setSeoFilterOpen,
  setSeoDateRange,
  openDownloadModal,
  seoRealtimeStats,
  RealTimeCard,
  SeoAuthorityCard,
  SeoOrganicSummaryCard,
  SearchVisibilityCard,
  seoSnapshots,
  SeoConversionCard,
  seoConversionSummary,
  SeoIssuesCard,
  seoIssues,
  SeoKeywordsTable,
  seoKeywordsDetailed,
  SeoCompetitorsCard,
  seoCompetitors,
  SeoPositionDistributionCard,
  seoPositionDistribution,
  SeoBacklinkSummaryCard,
  SeoCompetitiveMapCard,
  seoCompetitiveMap,
  SeoRegionalPerformanceCard,
  seoRegionalPerformance,
  TechnicalScoreList,
  seoTechnicalScores,
  SeoChannelMix,
  SeoRightRailCard,
  seoAuthorityScores,
  seoBacklinkHighlights,
  seoOrganicSearch,
  seoAnchors,
  seoReferringDomains,
  seoRightRailStats,
  seoUrlRatings,
  seoSectionRefs,
}) => {
  const SEO_PAGE_SCHEMA: SeoPageSchema = {
    layout: {
      mainGapClass: 'gap-5',
      gridClass: 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6',
      railClass: 'xl:sticky xl:top-28 self-start space-y-5',
    },
    fullWidthBlocks: [
      {
        id: 'kpi',
        kind: 'kpi',
        placement: 'full',
        title: 'Real-Time Analytics',
        subtitle: 'Organic KPIs styled to mirror the Overview Dashboard',
      },
    ],
    mainRows: [],
    railBlocks: [],
  };

  const renderBlock = (block: SeoPageBlock) => {
    switch (block.kind) {
      case 'kpi':
        return (
          <div className={`theme-panel rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm hover:shadow-lg transition-all duration-300 ${themeMode === 'light' ? '!bg-white !bg-none' : themePanelClass}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[20px] font-semibold theme-text">{block.title}</p>
                <p className="text-base theme-muted">{block.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs theme-muted uppercase">SEO Focus</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {seoRealtimeStats.map((stat: any) => (
                <RealTimeCard key={stat.id} label={stat.label} value={stat.value} delta={stat.delta} positive={stat.positive} />
              ))}
            </div>
          </div>
        );
      case 'authority':
        return <SeoAuthorityCard scores={seoAuthorityScores} />;
      case 'organicSummary':
        return <SeoOrganicSummaryCard summary={seoOrganicSearch} />;
      case 'visibility':
        return <SearchVisibilityCard snapshot={seoSnapshots} />;
      case 'conversion':
        return <SeoConversionCard summary={seoConversionSummary} />;
      case 'issues':
        return <SeoIssuesCard issues={seoIssues} />;
      case 'keywords':
        return <SeoKeywordsTable keywords={seoKeywordsDetailed} />;
      case 'competitors':
        return <SeoCompetitorsCard competitors={seoCompetitors} />;
      case 'positionDistribution':
        return <SeoPositionDistributionCard distribution={seoPositionDistribution} />;
      case 'backlinks':
        return (
          <SeoBacklinkSummaryCard
            highlights={seoBacklinkHighlights}
            anchors={seoAnchors}
            referringDomains={seoReferringDomains}
          />
        );
      case 'competitiveMap':
        return <SeoCompetitiveMapCard snapshot={seoCompetitiveMap} />;
      case 'regional':
        return <SeoRegionalPerformanceCard regions={seoRegionalPerformance} />;
      case 'technicalScores':
        return <TechnicalScoreList scores={seoTechnicalScores} />;
      case 'channelMix':
        return <SeoChannelMix channels={seoSnapshots.channels} />;
      case 'rightRail':
        return <SeoRightRailCard stats={seoRightRailStats} urlRatings={seoUrlRatings} />;
      default:
        return null;
    }
  };

  const fullWidthBlocks = SEO_PAGE_SCHEMA.fullWidthBlocks;
  const railBlocks = SEO_PAGE_SCHEMA.railBlocks;

  const SemiGauge: React.FC<{ value: number; color?: string }> = ({
    value,
    color,
  }) => {
    const [animatedValue, setAnimatedValue] = React.useState(0);
    const size = 200;
    const strokeWidth = 24;
    const duration = 1500; // ms

    React.useEffect(() => {
      let startTime: number;
      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percent = Math.min(progress / duration, 1);

        // Easing function: easeOutExpo
        const ease = percent === 1 ? 1 : 1 - Math.pow(2, -10 * percent);

        setAnimatedValue(value * ease);

        if (progress < duration) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, [value]);

    const clamped = Math.max(0, Math.min(100, Number.isFinite(animatedValue) ? animatedValue : 0));
    const radius = (size - strokeWidth) / 2;
    const circumference = Math.PI * radius;
    const dash = (clamped / 100) * circumference;
    const gap = circumference - dash;
    // Dynamic color based on current animated value
    const currentStroke = color || (clamped >= 80 ? '#22c55e' : clamped >= 60 ? '#eab308' : '#ef4444');

    return (
      <div className="relative w-full max-w-[160px] mx-auto aspect-[2/1]">
        <svg
          viewBox={`0 0 ${size} ${size / 2}`}
          className="block w-full h-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background Track */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="rgba(148,163,184,0.15)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value Progress */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={currentStroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-center translate-y-2">
          <span
            className="inline-flex items-center justify-center rounded-xl px-4 py-1 text-xl font-bold transition-colors duration-300"
            style={{ backgroundColor: 'rgba(148,163,184,0.15)', color: 'var(--theme-text)' }}
          >
            {Math.round(clamped)}
          </span>
        </div>
      </div>
    );
  };

  const MetricCard: React.FC<{ title: string; value: React.ReactNode; valueAccent?: string; rows?: Array<{ label: string; value: React.ReactNode }> }> = ({
    title,
    value,
    valueAccent,
    rows,
  }) => (
    <div className="theme-card rounded-3xl border border-gray-100 bg-white p-5" style={{ minHeight: 120 }}>
      <p className="text-sm font-semibold theme-text !mb-2">{title}</p>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-3xl font-bold" style={{ color: valueAccent || 'var(--theme-text)' }}>
          {value}
        </span>
        <span className="text-xs theme-muted">{title === 'Backlinks' ? 'Total Backlinks' : title === 'Organic Search' ? 'Total Traffic' : ''}</span>
      </div>
      <div className="space-y-1">
        {(rows || []).map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs">
            <span className="theme-muted">{row.label}</span>
            <span className="theme-text font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const GaugeCard: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
    <div className="theme-card rounded-3xl border border-gray-100 bg-white p-5 pb-8" style={{ minHeight: 120 }}>
      <p className="text-[16px] font-bold theme-text">{label}</p>
      <div className="mt-0 flex items-center justify-center">
        <SemiGauge value={value} color={color} />
      </div>
    </div>
  );

  const RegionalPerformanceCard: React.FC = () => {
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const regions = (Array.isArray(seoRegionalPerformance) ? seoRegionalPerformance : []).filter(Boolean).slice(0, 10);
    const total = regions.reduce((sum: number, row: any) => sum + Number(row.value ?? 0), 0);
    const safeTotal = total > 0 ? total : 100;

    const AREA_NAME_MAP: Record<string, string> = {
      BKK: 'Bangkok',
      CNX: 'Chiang Mai',
      HKT: 'Phuket',
      SKA: 'Songkhla',
      NMA: 'Nakhon Ratchasima',
      CBR: 'Chonburi',
      KKN: 'Khon Kaen',
      UDN: 'Udon Thani',
      KBI: 'Krabi',
      CBI: 'Chonburi (Alt)',
    };

    const TOTAL_USERS = 10000;

    const segments = regions.map((row: any, idx: number) => {
      const value = Number(row.value ?? 0);
      const region = String(row.region ?? row.label ?? '');
      return {
        key: region || `region-${idx}`,
        region,
        value,
        color: String(row.color ?? 'var(--accent-color)'),
        fullName: AREA_NAME_MAP[region] || region,
        users: Math.round((TOTAL_USERS * value) / safeTotal),
      };
    });

    const donutSize = 270;

    return (
      <div className="theme-card rounded-3xl border border-gray-100 bg-white p-6 h-[380px] flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[16px] font-semibold theme-text">Regional SEO Performance</p>
          <button
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-all download-pill hover:bg-white/5"
            style={{ color: 'var(--theme-text)', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent' }}
            title="Download"
            onClick={() => openDownloadModal('Regional SEO Performance')}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
        <div className="mt-5 flex flex-col md:flex-row md:items-center gap-6">
          <div className="shrink-0 flex items-center justify-center" style={{ width: 360 }}>
            <div
              className="relative flex-shrink-0"
              style={{ width: donutSize, height: donutSize }}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              <PieChart width={donutSize} height={donutSize}>
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="fullName"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="90%"
                  paddingAngle={3}
                  stroke="#fff"
                  strokeWidth={2}
                  activeIndex={activeIndex}
                  activeShape={(props) => (
                    <Sector {...props} outerRadius={(Number(props.outerRadius) || 0) + 6} />
                  )}
                >
                  {segments.map((entry, idx) => (
                    <Cell
                      key={entry.key}
                      fill={entry.color}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseMove={() => setActiveIndex(idx)}
                    />
                  ))}
                </Pie>
              </PieChart>

              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none p-6"
              >
                {activeIndex === -1 ? (
                  <>
                    <p className="text-[10px] uppercase theme-muted tracking-wide animate-in fade-in zoom-in duration-300">TOTAL</p>
                    <p className="text-xl font-semibold theme-text leading-tight whitespace-nowrap animate-in fade-in zoom-in duration-300">{Math.round(safeTotal).toLocaleString('en-US')}</p>
                    <p className="text-[10px] theme-muted animate-in fade-in zoom-in duration-300">Users</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold theme-text leading-tight whitespace-normal break-words w-full animate-in fade-in zoom-in duration-100 line-clamp-2">
                      {segments[activeIndex]?.fullName}
                    </p>
                    <p className="text-2xl font-bold theme-text leading-none my-1 animate-in fade-in zoom-in duration-100" style={{ color: segments[activeIndex]?.color }}>
                      {segments[activeIndex]?.value}%
                    </p>
                    <p className="text-xs theme-muted animate-in fade-in zoom-in duration-100">
                      {segments[activeIndex]?.users.toLocaleString('en-US')} Users
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-10 gap-y-3 min-w-0">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-3 min-w-0">
                <span className="h-7 w-3.5 rounded-sm" style={{ backgroundColor: seg.color }} />
                <span className="text-sm font-bold theme-text whitespace-nowrap">
                  {seg.fullName}: <span className="font-bold">{seg.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const AnchorsCard: React.FC = () => {
    // Fill up to 15 rows to ensure scrolling.
    // Add 3 more sample items as requested for filling.
    const dataDisplay = Array.from({ length: 15 }).map((_, i) => {
      if ((seoAnchors || [])[i]) return (seoAnchors || [])[i];
      return { anchor: '-', percent: 0, isPlaceholder: true };
    });

    const getProgressColor = (percent: number) => {
      if (percent <= 20) return '#ef4444'; // Red
      if (percent <= 40) return '#f97316'; // Orange-Red
      if (percent <= 60) return '#eab308'; // Yellow
      if (percent <= 80) return '#84cc16'; // Lime/Light Green
      return '#22c55e'; // Green
    };

    return (
      <div className="theme-card rounded-3xl border border-gray-100 bg-white p-6 flex flex-col h-[380px]">
        <div className="flex items-center justify-between gap-3 shrink-0 mb-4">
          <p className="text-[16px] font-semibold theme-text">Anchors</p>
          <p className="text-[14px] font-medium theme-muted text-right">Referring domains</p>
        </div>
        <div className="side-scrollbar space-y-3 flex-1 overflow-y-auto pr-4 -mr-4">
          {dataDisplay.map((row: any, idx: number) => {
            const percentValue = typeof row.percent === 'string' ? parseFloat(row.percent) : Number(row.percent);
            const safePercent = Number.isFinite(percentValue) ? Math.max(0, Math.min(100, percentValue)) : 0;
            const referringDomainsRaw = row.referringDomains ?? row.referring ?? row.domains;
            const referringDomainsValue = Number.isFinite(Number(referringDomainsRaw)) ? Number(referringDomainsRaw) : undefined;

            return (
              <div key={`${row.anchor}-${idx}`} className="grid grid-cols-[1fr_40px_50px_1fr] items-center gap-3 text-xs">
                <div className={`truncate min-w-0 ${row.isPlaceholder ? 'text-gray-300' : 'theme-text font-medium'}`}>{row.anchor}</div>
                <div className={`text-center ${row.isPlaceholder ? 'text-gray-300' : 'theme-text'}`}>
                  {row.isPlaceholder ? '-' : (referringDomainsValue != null ? referringDomainsValue : '-')}
                </div>
                <div className={`text-right ${row.isPlaceholder ? 'text-gray-300' : 'theme-muted'}`}>
                  {row.isPlaceholder || safePercent <= 0 ? '-' : `${Math.round(safePercent)}%`}
                </div>
                <div className="h-1.5 rounded-full w-24 justify-self-end" style={{ backgroundColor: 'rgba(148,163,184,0.15)' }}>
                  {!row.isPlaceholder && safePercent > 0 && (
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${safePercent}%`,
                        backgroundColor: getProgressColor(safePercent)
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TopCompetitorsCard: React.FC = () => {
    // Sample data based on the user image
    const rawCompetitors = Array.isArray(seoCompetitors) ? seoCompetitors : [];
    const palette = ['#f97316', '#fb923c', '#eab308', '#22c55e', '#60a5fa', '#a855f7'];
    const competitors = rawCompetitors
      .map((c: any, idx: number) => {
        const domain = String(c?.domain ?? c?.competitor ?? c?.host ?? c?.url ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
        const level = Number(c?.level ?? c?.comLevel ?? c?.competitionLevel ?? 0);
        const keywords = Number(c?.keywords ?? c?.comKeywords ?? c?.keywordCount ?? 0);
        const referring = Number(c?.referring ?? c?.referringDomains ?? c?.refDomains ?? 0);

        return {
          domain,
          level: Number.isFinite(level) ? Math.max(0, Math.min(100, level)) : 0,
          keywords: Number.isFinite(keywords) ? keywords : 0,
          referring: Number.isFinite(referring) ? referring : 0,
          color: palette[idx % palette.length],
        };
      })
      .filter((c: any) => c.domain);

    return (
      <div className="theme-card rounded-3xl border border-gray-100 bg-white p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-[18px] font-semibold theme-text">Top organic Competitors</p>
          <button className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold theme-text hover:bg-orange-600 hover:border-orange-200 hover:text-black-500 transition-colors">
            View All
          </button>
        </div>

        <div className="overflow-x-auto">
          {!competitors.length ? (
            <p className="text-sm theme-muted">No data available.</p>
          ) : (
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="text-left">
                <th className="pb-4 text-xs font-semibold theme-muted w-[30%]">Competitors</th>
                <th className="pb-4 text-xs font-semibold theme-muted w-[30%]">Com.Level</th>
                <th className="pb-4 text-xs font-semibold theme-muted text-center w-[20%]">Com.KeyWords</th>
                <th className="pb-4 text-xs font-semibold theme-muted text-center w-[20%]">Referring Domain</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp, idx) => (
                <tr key={idx} className="group border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-4 pr-4">
                    <a href={`https://${comp.domain}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-500 hover:underline flex items-center gap-1">
                      {comp.domain}
                    </a>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="h-2 w-full max-w-[140px] rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${comp.level}%`, backgroundColor: comp.color }}
                      />
                    </div>
                  </td>
                  <td className="py-4 text-center text-sm font-semibold theme-text">
                    {comp.keywords}
                  </td>
                  <td className="py-4 text-center">
                    <span className="inline-flex items-center justify-center bg-cyan-400 text-white font-bold text-xs h-6 px-2 rounded-md">
                      {comp.referring}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    );
  };

  const TopPositionDistributionCard: React.FC = () => {
    const [showSummary, setShowSummary] = useState(false);
    const rawDistribution = Array.isArray(seoPositionDistribution) ? seoPositionDistribution : [];
    const data = rawDistribution
      .map((row: any) => {
        const name = String(row?.range ?? row?.name ?? row?.label ?? '').trim();
        const value = Number(row?.value ?? 0);
        const fill =
          name.includes('1-3') || name.includes('Top 1-3')
            ? '#22c55e'
            : name.includes('4-10') || name.includes('Top 4-10')
              ? '#eab308'
              : name.includes('11-20') || name.includes('Top 11-20')
                ? '#f97316'
                : '#ef4444';
        return {
          name,
          value: Number.isFinite(value) ? value : 0,
          fill,
        };
      })
      .filter((row: any) => row.name);

    const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const topBucket = data.reduce((best, item) => (Number(item.value || 0) > Number(best.value || 0) ? item : best), data[0]);
    const quickWinBucket = data.find((item) => item.name === '4-10');
    const quickWinShare = total > 0 ? Math.round(((Number(quickWinBucket?.value || 0) / total) * 100) * 10) / 10 : 0;
    const topShare = total > 0 ? Math.round(((Number(topBucket?.value || 0) / total) * 100) * 10) / 10 : 0;

    return (
      <div className="theme-card rounded-3xl border border-gray-100 bg-white p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <p className="text-[18px] font-semibold theme-text">Organic Position Distribution</p>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-all download-pill hover:bg-white/5"
              style={{ color: 'var(--theme-text)', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent' }}
              title="Summary"
              onClick={() => setShowSummary((prev) => !prev)}
            >
              <Info className="h-3.5 w-3.5" />
              Summary
            </button>
            <button
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-all download-pill hover:bg-white/5"
              style={{ color: 'var(--theme-text)', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent' }}
              title="Download"
              onClick={() => openDownloadModal('Organic Position Distribution')}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        </div>

        {showSummary && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#0b1220] to-[#101a33] p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Summary</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85">
                Total
                <span className="inline-flex items-center justify-center rounded-full bg-white/15 text-white px-2 py-0.5 text-[10px] font-bold">
                  {total}
                </span>
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100/70">Largest bucket</p>
                    <p className="mt-2 text-[20px] leading-tight font-semibold text-white">
                      {topBucket?.name}
                      <span className="text-white/30"> • </span>
                      {topBucket?.value}
                    </p>
                    <p className="mt-1 text-xs text-sky-100/70">≈ {topShare}% of total</p>
                  </div>
                  <span
                    className="h-9 w-9 rounded-xl border border-white/10"
                    style={{ backgroundColor: String(topBucket?.fill || '#e5e7eb') + '33' }}
                  />
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148,163,184,0.18)' }}>
                  <div className="h-full rounded-full" style={{ width: `${topShare}%`, backgroundColor: String(topBucket?.fill || '#9ca3af') }} />
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100/70">Quick win</p>
                    <p className="mt-2 text-[20px] leading-tight font-semibold text-white">
                      4-10
                      <span className="text-white/30"> • </span>
                      {quickWinBucket?.value ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-sky-100/70">≈ {quickWinShare}% of total (push to 1-3)</p>
                  </div>
                  <span
                    className="h-9 w-9 rounded-xl border border-white/10"
                    style={{ backgroundColor: String(quickWinBucket?.fill || '#e5e7eb') + '33' }}
                  />
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148,163,184,0.18)' }}>
                  <div className="h-full rounded-full" style={{ width: `${quickWinShare}%`, backgroundColor: String(quickWinBucket?.fill || '#9ca3af') }} />
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100/70">Priority focus</p>
                <p className="mt-2 text-sm font-semibold text-white leading-relaxed">
                  Optimize pages in 4-10 first, then lift 11-20 to page 1.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/85">On-page</span>
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/85">Internal links</span>
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/85">Content refresh</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!data.length ? (
          <p className="text-sm theme-muted">No data available.</p>
        ) : (
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                axisLine={true}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis
                hide={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="4 4" />
              <RechartsTooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>
    );
  };

  const HeaderStat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
      <span className="text-sm font-medium theme-text">{label.replace(':', '')}</span>
      <span className="text-lg font-bold theme-text">{value}</span>
    </div>
  );

  const StatRow: React.FC<{ label: string; value: number; total?: number }> = ({ label, value, total = 100 }) => (
    <div className="flex items-center justify-between py-2.5 text-xs">
      <span className="theme-muted">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-medium theme-text w-60 text-center">{value}</span>
        <span className="theme-muted w-10 text-right whitespace-nowrap">100%</span>
      </div>
    </div>
  );

  const DetailedStatsCard: React.FC = () => {
    const [pageIndex, setPageIndex] = useState(0);

    const pages = [
      {
        title: 'Referring Domains',
        content: (
          <>
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm font-medium theme-text">Total Domains</span>
              <span className="text-sm font-semibold theme-muted w-10 text-center">0</span>
            </div>
            <div className="space-y-3 pl-1 mt-4">
              <StatRow label="Dufollow" value={0} />
              <StatRow label="Governmental" value={0} />
              <StatRow label="Educational" value={0} />
              <StatRow label=".gov" value={0} />
              <StatRow label=".edu" value={0} />
              <StatRow label=".com" value={0} />
              <StatRow label=".net" value={0} />
              <StatRow label=".org" value={0} />
            </div>
          </>
        )
      },
      {
        title: 'Backlinks',
        content: (
          <>
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm font-medium theme-text">Total Backlinks</span>
              <span className="text-sm font-semibold theme-muted w-10 text-center">0</span>
            </div>
            <div className="space-y-3 pl-1 mt-4">
              <StatRow label="Dofollow" value={0} />
              <StatRow label="Nofollow" value={0} />
              <StatRow label="UGC" value={0} />
              <StatRow label="Sponsored" value={0} />
              <StatRow label="Text" value={0} />
              <StatRow label="Redirect" value={0} />
              <StatRow label="Image" value={0} />
              <StatRow label="Form" value={0} />
              <StatRow label="Governmental" value={0} />
              <StatRow label="Educational" value={0} />
            </div>
          </>
        )
      },
      {
        title: 'Network & Ratings',
        content: (
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              {[
                { title: 'Referring pages', val: 440 },
                { title: 'Referring Ips', val: 57 },
                { title: 'Referring subnets', val: 53 },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm font-medium theme-text">{item.title}</span>
                  <span className="text-sm font-semibold theme-muted">{item.val}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[14px] font-semibold theme-text mb-3">URL Rating Distribution</p>
              <div className="space-y-3">
                {[
                  { range: '81-100', count: 1, percent: '1%', color: '#22c55e' },
                  { range: '61-80', count: 2, percent: '2%', color: '#eab308' },
                  { range: '41-60', count: 0, percent: '0%', color: '#f97316' },
                  { range: '21-40', count: 1, percent: '0%', color: '#ea580c' },
                  { range: '1-20', count: 91, percent: '92%', color: '#dc2626' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="theme-muted">{item.range}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold theme-text">{item.count}</span>
                      <span className="theme-muted w-10 text-right whitespace-nowrap">{item.percent}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      }
    ];

    const nextSlide = () => setPageIndex((prev) => (prev + 1) % pages.length);
    const prevSlide = () => setPageIndex((prev) => (prev - 1 + pages.length) % pages.length);
    const activePage = pages[pageIndex];

    return (
      <div className="theme-card rounded-3xl border border-gray-100 bg-white p-6 space-y-4 min-h-[420px] flex flex-col">
        {/* Header Stats - Always Visible */}
        <div>
          <HeaderStat label="Crawled pages:" value={528} />
        </div>

        {/* Navigation Header */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-[16px] font-semibold theme-text transition-all duration-300">
            {activePage.title}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={prevSlide}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextSlide}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 animate-in fade-in duration-300 slide-in-from-right-2">
          {activePage.content}
        </div>

        <div className="flex justify-center gap-1.5 pt-2">
          {pages.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === pageIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-gray-200'}`}
            />
          ))}
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-8">
      <div className={themeMode === 'light' ? 'bg-white rounded-3xl border border-gray-100 shadow-lg' : ''}>
        <section
          ref={seoSectionRefs.overview}
          className={`${themeMode === 'light' ? 'p-6 space-y-6' : 'theme-section rounded-3xl p-6 shadow-lg space-y-6'} scroll-mt-28`}
        >
        <SectionTitle
          title="SEO & Web Analytics"
          subtitle="Real-time SERP visibility & organic insights"
          badge={
            <span className="rounded-full border border-orange-200 bg-white/70 px-4 py-1 text-xs font-semibold text-orange-600">
              SEO insights • Live data
            </span>
          }
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase text-gray-500">
                {filterOptions.find((option) => option.key === seoDateRange)?.label || 'Last 30 Days'}
              </span>

              <button
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-800"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <div className="relative">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-800"
                  onClick={() => setSeoFilterOpen((prev) => !prev)}
                >
                  <Filter className="h-4 w-4" />
                  {filterOptions.find((option) => option.key === seoDateRange)?.label || 'Filter'}
                </button>
                {seoFilterOpen && (
                  <div className="absolute right-0 mt-2 w-48 theme-card rounded-2xl p-3 shadow-2xl z-10">
                    {filterOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setSeoDateRange(option.key)
                          setSeoFilterOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold ${
                          seoDateRange === option.key ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <button className="w-full mt-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                      Custom
                    </button>
                  </div>
                )}
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-800"
                onClick={() => openDownloadModal('SEO & Web Analytics')}
              >
                <Download className="h-4 w-4" /> Download data
              </button>
            </div>
          }
        />

        <div className="space-y-6">
          {fullWidthBlocks.map((block) => (
            <div key={block.id}>{renderBlock(block)}</div>
          ))}

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <GaugeCard
                label={Array.isArray(seoAuthorityScores) ? seoAuthorityScores?.[0]?.label || 'UR' : 'UR'}
                value={Array.isArray(seoAuthorityScores) ? Number(seoAuthorityScores?.[0]?.value ?? 0) : 0}
                color="#22c55e"
              />
              <GaugeCard
                label={Array.isArray(seoAuthorityScores) ? seoAuthorityScores?.[1]?.label || 'DR' : 'DR'}
                value={Array.isArray(seoAuthorityScores) ? Number(seoAuthorityScores?.[1]?.value ?? 0) : 0}
                color="#f59e0b"
              />
              <MetricCard
                title="Backlinks"
                value={seoBacklinkHighlights?.totalBacklinks ?? '-'}
                valueAccent="#2563eb"
                rows={[
                  { label: 'Referring Domains', value: seoBacklinkHighlights?.referringDomains ?? '-' },
                  { label: 'Keywords', value: seoBacklinkHighlights?.keywords ?? '-' },
                  { label: 'Traffic Cost', value: seoBacklinkHighlights?.trafficCost ?? '-' },
                ]}
              />
              <MetricCard
                title="Organic Search"
                value={seoOrganicSearch?.traffic ?? seoOrganicSearch?.keywords ?? '-'}
                valueAccent="#22c55e"
                rows={[
                  { label: 'Keywords', value: seoOrganicSearch?.keywords ?? '-' },
                  { label: 'Traffic Cost', value: seoOrganicSearch?.trafficCost ?? '-' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5 min-w-0">
                <div ref={seoSectionRefs.regional} className="scroll-mt-24">
                  <RegionalPerformanceCard />
                </div>
                <TopPositionDistributionCard />
                <SeoKeywordsTable keywords={seoKeywordsDetailed} downloadFileName="top-organic-keywords.csv" />
                <div ref={seoSectionRefs.competitors} className="scroll-mt-24">
                  <TopCompetitorsCard />
                </div>
              </div>
              <div className="lg:col-span-1 space-y-5 min-w-0">
                <AnchorsCard />
                <DetailedStatsCard />
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default SeoSection;
