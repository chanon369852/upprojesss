import React from 'react';
import SectionTitle from '../SectionTitle';

export type CrmSectionProps = {
  themedSectionClass: string;
  themePanelClass: string;
  crmRealtime: any[];
  RealTimeCard: React.ComponentType<any>;
  CrmStageChart: React.ComponentType<any>;
  crmStages: any;
  CrmAgeDonut: React.ComponentType<any>;
  crmAgeRange: any;
  LeadTrackingTable: React.ComponentType<any>;
  crmLeads: any;
};

const CrmSection: React.FC<CrmSectionProps> = ({
  themedSectionClass,
  themePanelClass,
  crmRealtime,
  RealTimeCard,
  CrmStageChart,
  crmStages,
  CrmAgeDonut,
  crmAgeRange,
  LeadTrackingTable,
  crmLeads,
}) => {

  return (
    <div className="space-y-8">
      <section className={themedSectionClass}>
        <SectionTitle
          title="CRM & Leads"
          subtitle="Track leads, analyze customers, and manage integrations"
          badge={
            <span className="rounded-full border border-orange-200 bg-white/70 px-4 py-1 text-xs font-semibold text-orange-600">
              CRM overview • Live data
            </span>
          }
        />

        <div className={`${themePanelClass} shadow-sm hover:shadow-lg transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[20px] font-semibold theme-text">Real-Time Analytics</p>
              <p className="text-base theme-muted">Performance overview for your pipeline</p>
            </div>
            <p className="text-xs theme-muted">+6.5% from last period</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {crmRealtime.map((stat: any) => (
              <RealTimeCard key={stat.id} label={stat.label} value={stat.value} delta={stat.delta} positive={stat.positive} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CrmStageChart stages={crmStages} />
          <CrmAgeDonut ranges={crmAgeRange} />
        </div>

        <LeadTrackingTable leads={crmLeads} />
      </section>
    </div>
  );
};

export default CrmSection;
