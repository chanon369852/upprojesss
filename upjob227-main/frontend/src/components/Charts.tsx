import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  ErrorBar,
} from 'recharts';
import { format } from 'date-fns';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

export type ChartDatum = {
  date: string;
  [key: string]: number | string | null | undefined;
};

interface MetricsChartProps {
  metrics: ChartDatum[];
  metric: string;
  title: string;
  color?: string;
}

export const MetricsLineChart: React.FC<MetricsChartProps> = ({ metrics, metric, title, color = '#3b82f6' }) => {
  const data = metrics
    .filter(m => m[metric] !== undefined && m[metric] !== null)
    .map(m => ({
      date: format(new Date(m.date), 'MMM dd'),
      value: typeof m[metric] === 'string' ? parseFloat(m[metric] as string) : Number(m[metric] ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke={color} name={title} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ScatterPerformanceChartProps {
  title: string;
  data: { name: string; spend: number; conversions: number; cpa: number }[];
  xLabel?: string;
  yLabel?: string;
}

export const ScatterPerformanceChart: React.FC<ScatterPerformanceChartProps> = ({
  title,
  data,
  xLabel = 'Spend',
  yLabel = 'Conversions',
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="spend" name={xLabel} tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`} />
        <YAxis type="number" dataKey="conversions" name={yLabel} />
        <ZAxis type="number" dataKey="cpa" range={[60, 260]} name="Avg. CPA" />
        <Tooltip
          formatter={(value, name) => {
            if (name === 'spend') return [`$${Number(value).toLocaleString('en-US')}`, xLabel];
            if (name === 'conversions') return [Number(value).toLocaleString(), yLabel];
            if (name === 'cpa') return [`$${Number(value).toLocaleString('en-US')}`, 'Avg. CPA'];
            return [value, name];
          }}
          cursor={{ strokeDasharray: '3 3' }}
        />
        <Legend />
        <Scatter data={data} fill="#a855f7" name="Campaign" />
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

interface StockPerformanceChartProps {
  title: string;
  data: { date: string; open: number; close: number; high: number; low: number }[];
}

export const StockPerformanceChart: React.FC<StockPerformanceChartProps> = ({ title, data }) => {
  const chartData = data.map((point) => ({
    ...point,
    range: [point.low, point.high] as [number, number],
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip
            formatter={(value, rawName) => {
              const name = typeof rawName === 'string' ? rawName : String(rawName ?? '');
              if (['open', 'close', 'high', 'low'].includes(name)) {
                const label = name.charAt(0).toUpperCase() + name.slice(1);
                return [`$${Number(value).toLocaleString('en-US')}`, label];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2} name="Close" dot={{ r: 3 }}>
            <ErrorBar dataKey="range" width={6} stroke="#111827" strokeWidth={1.5} />
          </Line>
          <Line type="monotone" dataKey="open" stroke="#f97316" strokeWidth={1.5} name="Open" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MetricsBarChart: React.FC<MetricsChartProps> = ({ metrics, metric, title, color = '#10b981' }) => {
  const data = metrics
    .filter(m => m[metric] !== undefined && m[metric] !== null)
    .map(m => ({
      date: format(new Date(m.date), 'MMM dd'),
      value: typeof m[metric] === 'string' ? parseFloat(m[metric] as string) : Number(m[metric] ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill={color} name={title} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface PlatformPieChartProps {
  data: { name: string; value: number }[];
  title: string;
}

export const PlatformPieChart: React.FC<PlatformPieChartProps> = ({ data, title }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const safeData = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .map((row, index) => ({
          name: String((row as any)?.name ?? ''),
          value: Number.isFinite((row as any)?.value) ? Number((row as any).value) : 0,
          color: PIE_COLORS[index % PIE_COLORS.length],
        }))
        .filter((row) => row.name),
    [data]
  );

  const total = useMemo(() => safeData.reduce((sum, row) => sum + row.value, 0), [safeData]);

  const activeSlice = useMemo(() => {
    if (activeIndex < 0) return null;
    return safeData[activeIndex] ?? null;
  }, [activeIndex, safeData]);

  const activeSlicePercent = useMemo(() => {
    if (!activeSlice) return 0;
    if (!total) return 0;
    return (activeSlice.value / total) * 100;
  }, [activeSlice, total]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="relative w-full">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={safeData}
              dataKey="value"
              nameKey="name"
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
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              {safeData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | string, _name: any, payload: any) => {
                const numericValue = typeof value === 'number' ? value : Number(value);
                const percent = total > 0 ? (numericValue / total) * 100 : 0;
                return [
                  `${Number.isFinite(numericValue) ? numericValue.toLocaleString('en-US') : '0'} (${percent.toFixed(1)}%)`,
                  payload?.payload?.name,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
          <p className="text-[10px] uppercase text-gray-400 tracking-wide">{activeSlice ? activeSlice.name : 'TOTAL'}</p>
          <p className="text-2xl font-semibold text-gray-900 leading-tight whitespace-nowrap">
            {activeSlice
              ? `${activeSlice.value.toLocaleString('en-US')} • ${activeSlicePercent.toFixed(1)}%`
              : total.toLocaleString('en-US')}
          </p>
        </div>
      </div>
    </div>
  );
};
