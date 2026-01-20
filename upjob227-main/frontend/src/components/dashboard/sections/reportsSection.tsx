import React from 'react';
import SectionTitle from '../SectionTitle';

export type ReportsSectionProps = {
  themedSectionClass: string;
  mockReportBuilders: any;
  ScheduleReportCard: React.ComponentType<any>;
  ReportStatusTable: React.ComponentType<any>;
  settingsData: any;
  platformOptions: string[];
};

const ReportsSection: React.FC<ReportsSectionProps> = ({
  themedSectionClass,
  mockReportBuilders,
  ScheduleReportCard,
  ReportStatusTable,
  settingsData,
  platformOptions,
}) => {

  return (
    <div className="space-y-8">
      <section className={themedSectionClass}>
        <SectionTitle
          title="Reports & Automation"
          subtitle="Track and optimize your marketing campaigns"
          badge={
            <span className="rounded-full border border-orange-200 bg-white/70 px-4 py-1 text-xs font-semibold text-orange-600">
              Reports & schedules • Live data
            </span>
          }
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
          <div className="xl:col-span-1">
            <ScheduleReportCard
              schedule={mockReportBuilders.schedule}
              recipientOptions={settingsData?.alerts?.recipients || []}
              platformOptions={platformOptions}
            />
          </div>
          <div className="xl:col-span-2">
            <ReportStatusTable />
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReportsSection;
