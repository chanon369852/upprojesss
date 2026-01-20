import React from 'react';
import SectionTitle from '../SectionTitle';

export type CommerceSectionProps = {
  themedSectionClass: string;
  themePanelClass: string;
  commerceRealtime: any[];
  RealTimeCard: React.ComponentType<any>;
  ProfitabilityChart: React.ComponentType<any>;
  commerceProfitability: any;
  CommerceFunnelChart: React.ComponentType<any>;
  commerceConversionFunnel: any;
  RevenueOrdersTrendChart: React.ComponentType<any>;
  commerceRevenueTrend: any;
  productPerformance: any[];
  commerceCreatives: any[];
  commerceProductVideos: any[];
};

const CommerceSection: React.FC<CommerceSectionProps> = ({
  themedSectionClass,
  themePanelClass,
  commerceRealtime,
  RealTimeCard,
  ProfitabilityChart,
  commerceProfitability,
  CommerceFunnelChart,
  commerceConversionFunnel,
  RevenueOrdersTrendChart,
  commerceRevenueTrend,
  productPerformance,
  commerceCreatives,
  commerceProductVideos,
}) => {

  return (
    <div className="space-y-8">
      <section className={themedSectionClass}>
        <SectionTitle
          title="E-commerce Insights"
          subtitle="Track and optimize your marketing campaigns"
          badge={
            <span className="rounded-full border border-orange-200 bg-white/70 px-4 py-1 text-xs font-semibold text-orange-600">
              Commerce insights • Live data
            </span>
          }
        />

        <div className={`${themePanelClass} shadow-sm hover:shadow-lg transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[20px] font-semibold text-gray-900">Real-Time Analytics</p>
              <p className="text-base text-gray-500">Live KPI snapshot across your store</p>
            </div>
            <p className="text-xs text-gray-500">+6.5% vs last period</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {commerceRealtime.map((stat: any) => (
              <RealTimeCard key={stat.id} label={stat.label} value={stat.value} delta={stat.helper} positive={stat.positive} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ProfitabilityChart data={commerceProfitability} />
          <CommerceFunnelChart steps={commerceConversionFunnel} />
        </div>

        <div className="space-y-4">
          <RevenueOrdersTrendChart data={commerceRevenueTrend} />
          <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-gray-900">Product Performance</p>
              <p className="text-sm text-gray-500">Performance table • Updated hourly</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead>
                  <tr className="text-left text-[12px] uppercase text-gray-500">
                    <th className="py-3 pr-6">Product Name</th>
                    <th className="py-3 pr-6">Category</th>
                    <th className="py-3 pr-6">Sales</th>
                    <th className="py-3 pr-6">Revenue</th>
                    <th className="py-3 pr-6">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productPerformance.map((product: any) => (
                    <tr
                      key={product.name}
                      className="group text-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 hover:shadow-sm transition-colors duration-150 cursor-pointer"
                    >
                      <td className="py-4 pr-6 font-semibold theme-text">{product.name}</td>
                      <td className="py-4 pr-6 theme-muted">{product.category}</td>
                      <td className="py-4 pr-6 theme-text">{product.sales.toLocaleString('en-US')}</td>
                      <td className="py-4 pr-6 theme-text">${product.revenue.toLocaleString('en-US')}</td>
                      <td className="py-4 pr-6 theme-text">{product.stock}</td>
                      <td className="py-4 pr-6 w-1/6">
                        <span className="px-6 py-2.5 rounded-full text-[10px] font-bold uppercase bg-gray-700 text-white">
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                Learn more
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Creative previews</p>
            <p className="text-xs text-gray-500">Preview cards • Replace with live assets later</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commerceCreatives.map((creative: any) => (
              <div key={creative.id} className="rounded-3xl border border-gray-100 bg-white p-4 space-y-4 shadow-sm">
                <div className="aspect-video w-full rounded-2xl bg-gray-100" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-gray-900">{creative.name}</p>
                  <p className="text-xs text-gray-500">Type: {creative.type}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <p className="text-[11px] uppercase text-gray-400">Reach</p>
                    <p className="font-semibold text-gray-900">{creative.reach.toLocaleString('en-US')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase text-gray-400">Reactions</p>
                    <p className="font-semibold text-gray-900">{creative.reactions.toLocaleString('en-US')}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-gray-700 text-white text-sm font-bold px-5 py-2 uppercase">
                    {creative.cta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Product Video Performance</p>
              <p className="text-xs text-gray-500">Monitor shoppable video creatives across channels</p>
            </div>
            <button className="px-3 py-1 rounded-full border border-gray-200 text-xs font-semibold text-gray-700">Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-gray-500">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2 pr-4">Platform</th>
                  <th className="py-2 pr-4">Format</th>
                  <th className="py-2 pr-4">Length</th>
                  <th className="py-2 pr-4">Views</th>
                  <th className="py-2 pr-4">Completion</th>
                  <th className="py-2 pr-4">CTR</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commerceProductVideos.map((video: any) => (
                  <tr key={video.id} className="text-gray-800">
                    <td className="py-3 pr-4 font-semibold text-gray-900">{video.product}</td>
                    <td className="py-3 pr-4 text-gray-600">{video.campaign}</td>
                    <td className="py-3 pr-4 text-gray-600">{video.platform}</td>
                    <td className="py-3 pr-4 text-gray-600">{video.format}</td>
                    <td className="py-3 pr-4 text-gray-600">{video.length}</td>
                    <td className="py-3 pr-4">{video.views.toLocaleString('en-US')}</td>
                    <td className="py-3 pr-4">{video.completionRate}</td>
                    <td className="py-3 pr-4">{video.ctr}</td>
                    <td className="py-3 pr-4">${video.revenue.toLocaleString('en-US')}</td>
                    <td className="py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] uppercase ${
                          video.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-600'
                            : video.status === 'Learning'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {video.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CommerceSection;
