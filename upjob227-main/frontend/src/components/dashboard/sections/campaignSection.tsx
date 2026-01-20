import React from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import SectionTitle from '../SectionTitle';

type FilterOption = { key: string; label: string };

export type CampaignSectionRefs = {
  performance: React.RefObject<HTMLDivElement>;
  visualization: React.RefObject<HTMLDivElement>;
};

export type CampaignSectionProps = {
  campaignSectionRefs: CampaignSectionRefs;
  themePanelClass: string;
  RealTimeCard: React.ComponentType<any>;
  realtimeModeEnabled: boolean;
  handleRefresh: () => void;
  filterOptions: ReadonlyArray<FilterOption>;
  campaignDateRange: string;
  campaignFilterOpen: boolean;
  setCampaignFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCampaignDateRange: (value: string) => void;
  CampaignSourceTabs: React.ComponentType<any>;
  campaignSourceInsights: any[];
  conversionConnectionStatus: any;
  brandingTheme: { mode: string };
  openDownloadModal: (title: string) => void;
};

const CampaignSection: React.FC<CampaignSectionProps> = ({
  campaignSectionRefs,
  themePanelClass,
  RealTimeCard,
  realtimeModeEnabled,
  handleRefresh,
  filterOptions,
  campaignDateRange,
  campaignFilterOpen,
  setCampaignFilterOpen,
  setCampaignDateRange,
  CampaignSourceTabs,
  campaignSourceInsights,
  conversionConnectionStatus,
  brandingTheme,
  openDownloadModal,
}) => {

  const campaignProviderBySourceId: Record<string, string> = {
    google: 'googleads',
    'google-analytics': 'googleanalytics',
    facebook: 'facebook',
    tiktok: 'tiktok',
    line: 'line',
  };

  const connectedCampaignSources = (campaignSourceInsights || []).filter((source: any) => {
    const provider = campaignProviderBySourceId[source.id] || source.id;
    return conversionConnectionStatus?.[provider] === 'connected';
  });

  const sourcesToShow = connectedCampaignSources.length ? connectedCampaignSources : campaignSourceInsights;

  return (
    <div className="space-y-8">
      <section ref={campaignSectionRefs.performance} className={`${themePanelClass} scroll-mt-28`}>
        <SectionTitle
          title="Campaign Performance"
          subtitle="Track and optimize your marketing campaigns"
          badge={
            <span className="rounded-full border border-orange-200 bg-white/70 px-4 py-1 text-xs font-semibold text-orange-600">
              Campaign insights • Live data
            </span>
          }
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase text-gray-500">
                Last 30 Days
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
                  onClick={() => setCampaignFilterOpen((prev: any) => !prev)}
                >
                  <Filter className="h-4 w-4" />
                  {filterOptions.find((option: any) => option.key === campaignDateRange)?.label || 'Filter'}
                </button>
                {campaignFilterOpen && (
                  <div className="absolute right-0 mt-2 w-48 theme-card rounded-2xl p-3 shadow-2xl z-10">
                    {filterOptions.map((option: any) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setCampaignDateRange(option.key);
                          setCampaignFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold ${
                          campaignDateRange === option.key ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
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
            </div>
          }
        />

        <CampaignSourceTabs
          sources={sourcesToShow}
          themeMode={brandingTheme.mode}
          themePanelClass={themePanelClass}
          RealTimeCard={RealTimeCard}
          realtimeModeEnabled={realtimeModeEnabled}
          onDownload={openDownloadModal}
          visualizationRef={campaignSectionRefs.visualization}
        />
      </section>
    </div>
  );
};

export default CampaignSection;
