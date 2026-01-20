import React from 'react';

type SectionTitleProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
};

const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, actions, badge }) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="space-y-2 max-w-4xl">
      <h2 className="text-[24px] leading-snug md:text-[24px] font-semibold text-gray-900  break-words">{title}</h2>
      {subtitle && <p className="text-gray-500 !text-[16px] !leading-relaxed !mb-0 break-words">{subtitle}</p>}
    </div>
    {(badge || actions) && (
      <div className="flex items-center gap-2">
        {badge}
        {actions}
      </div>
    )}
  </div>
);

export default SectionTitle;
export type { SectionTitleProps };
