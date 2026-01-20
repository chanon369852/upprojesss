import React from 'react';
import { useNavigate } from 'react-router-dom';
import SectionTitle from '../SectionTitle';
import { Button } from '../../ui/button';
import { getStoredRole, hasAnyPermission, PERMISSIONS } from '../../../lib/rbac';

export type TrendSectionProps = {
  themedSectionClass: string;
  themePanelClass: string;
  trendSectionRefs: {
    overview: React.RefObject<HTMLDivElement>;
    revenueCosts: React.RefObject<HTMLDivElement>;
    revenueTrend: React.RefObject<HTMLDivElement>;
    retention: React.RefObject<HTMLDivElement>;
  };
  trendRealtime: any[];
  RealTimeCard: React.ComponentType<any>;
  ChannelComparisonChart: React.ComponentType<any>;
  trendRevenueByChannel: any;
  SalesFunnelChart: React.ComponentType<any>;
  trendSalesFunnel: any;
  RevenueTrendChart: React.ComponentType<any>;
  trendRevenueTrend: any;
  YtdRevenueCard: React.ComponentType<any>;
  LeadSourceTable: React.ComponentType<any>;
  trendLeadSources: any;
  SalesRepTable: React.ComponentType<any>;
  trendSalesReps: any;
};

const TrendSection: React.FC<TrendSectionProps> = ({
  themedSectionClass,
  themePanelClass,
  trendSectionRefs,
  trendRealtime,
  RealTimeCard,
  ChannelComparisonChart,
  trendRevenueByChannel,
  SalesFunnelChart,
  trendSalesFunnel,
  RevenueTrendChart,
  trendRevenueTrend,
  YtdRevenueCard,
  LeadSourceTable,
  trendLeadSources,
  SalesRepTable,
  trendSalesReps,
}) => {

  const navigate = useNavigate();
  const canSeeHistory = hasAnyPermission(getStoredRole(), [
    PERMISSIONS.view_system_history,
    PERMISSIONS.view_admin_history,
    PERMISSIONS.view_user_history,
    PERMISSIONS.export_logs,
    PERMISSIONS.manage_integrations,
  ]);

  return (
    <div className="space-y-8">
      <section className={themedSectionClass}>
        <SectionTitle
          title="Trend Analysis & History"
          subtitle="Track your metrics over time and compare performance across periods"
          badge={
            <span className="rounded-full border border-orange-200 bg-white/70 px-4 py-1 text-xs font-semibold text-orange-600">
              Trend insights • Live data
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              {canSeeHistory ? (
                <Button variant="outline" size="sm" onClick={() => navigate('/history')}>
                  View Sync History
                </Button>
              ) : null}
            </div>
          }
        />

        <div
          ref={trendSectionRefs.overview}
          className={`${themePanelClass} shadow-sm hover:shadow-lg transition-all duration-300 scroll-mt-28`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[20px] font-semibold text-gray-900">Real-Time Analytics</p>
              <p className="text-base text-gray-500">Comparative metrics this period vs last</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {trendRealtime.map((stat: any) => (
              <RealTimeCard key={stat.id} label={stat.label} value={stat.value} delta={stat.delta} positive={stat.positive} />
            ))}
          </div>
        </div>

        <div ref={trendSectionRefs.revenueCosts} className="grid grid-cols-1 xl:grid-cols-2 gap-4 scroll-mt-28">
          <ChannelComparisonChart data={trendRevenueByChannel} />
          <SalesFunnelChart stages={trendSalesFunnel} />
        </div>

        <div ref={trendSectionRefs.revenueTrend} className="grid grid-cols-1 xl:grid-cols-3 gap-4 scroll-mt-28">
          <div className="xl:col-span-2">
            <RevenueTrendChart data={trendRevenueTrend} />
          </div>
          <YtdRevenueCard data={trendRevenueTrend} />
        </div>

        <div ref={trendSectionRefs.retention} className="grid grid-cols-1 xl:grid-cols-2 gap-4 scroll-mt-28">
          <LeadSourceTable sources={trendLeadSources} />
          <SalesRepTable reps={trendSalesReps} />
        </div>
      </section>
    </div>
  );
};

export default TrendSection;
