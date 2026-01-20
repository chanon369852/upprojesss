import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

type RefreshSettings = {
  manual?: boolean;
  realtime?: boolean;
  frequency?: string;
};

type DataRefreshCardProps = {
  settingsData: { refresh: RefreshSettings };
  onChangeRefresh: (patch: Partial<RefreshSettings>) => void;
  onManualTrigger: () => void;
};

const DataRefreshCard: React.FC<DataRefreshCardProps> = ({ settingsData, onChangeRefresh, onManualTrigger }) => {
  const frequencyOptions = ['Every 5 minutes', 'Every 15 minutes', 'Every 30 minutes', 'Hourly', 'Daily'];
  const manualEnabled = Boolean(settingsData.refresh.manual);
  const realtimeEnabled = Boolean(settingsData.refresh.realtime);
  const [manualSpinning, setManualSpinning] = useState(false);

  const currentFrequency = settingsData.refresh.frequency || 'Every 5 minutes';

  return (
    <div className="theme-card rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-semibold theme-text text-[20px] leading-tight mb-0">Data Refresh Schedule</p>
            <p className="theme-muted !text-[12px] !leading-tight !mb-0">Control how often this dashboard pulls fresh data.</p>
          </div>
        </div>
        <span
          className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium border"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: realtimeEnabled ? 'var(--accent-color)' : 'var(--theme-border)' }}
          />
          {realtimeEnabled ? 'Real-time ON' : 'Real-time OFF'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium theme-text">Refresh frequency</p>
          <span className="text-[11px] theme-muted">Applies to all refresh modes</span>
        </div>
        <div className="relative">
          <select
            className="theme-input w-full rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm appearance-none pr-10"
            value={currentFrequency}
            onChange={(event) => onChangeRefresh({ frequency: event.target.value })}
          >
            {frequencyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-xs theme-muted">▼</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="theme-panel rounded-2xl px-4 py-3 flex flex-col gap-2 justify-between min-h-[124px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium theme-text">Manual refresh</p>
              <p className="text-[11px] theme-muted">Trigger updates only when you click refresh.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setManualSpinning(true);
              onManualTrigger();
              setTimeout(() => setManualSpinning(false), 700);
            }}
            className="inline-flex items-center justify-between w-full rounded-full px-3 py-1.5 text-xs font-medium border transition-colors theme-text"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <span className="flex items-center gap-2">
              <Loader2 className={`h-3.5 w-3.5 ${manualSpinning ? 'animate-spin' : ''}`} />
              Manual trigger
            </span>
            <span className="text-[10px] uppercase tracking-wide">Manual</span>
          </button>
        </div>

        <div className="theme-panel rounded-2xl px-4 py-3 flex flex-col gap-2 justify-between min-h-[124px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium theme-text">Real-time sync</p>
              <p className="text-[11px] theme-muted">Automatically refresh based on the selected interval.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChangeRefresh({ realtime: !realtimeEnabled })}
            className="inline-flex items-center justify-between w-full rounded-full px-3 py-1.5 text-xs font-medium border transition-colors theme-text"
            style={
              realtimeEnabled
                ? { backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)', color: '#ffffff' }
                : { borderColor: 'var(--theme-border)' }
            }
          >
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5" />
              Real-time mode
            </span>
            <span className="text-[10px] uppercase tracking-wide">{realtimeEnabled ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataRefreshCard;
export type { DataRefreshCardProps, RefreshSettings };
