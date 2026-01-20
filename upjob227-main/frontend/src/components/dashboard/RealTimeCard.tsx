import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

type RealTimeCardProps = {
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
  active?: boolean;
  onSelect?: () => void;
  detail?: string;
  realtimeModeEnabled?: boolean;
};

const RealTimeCard: React.FC<RealTimeCardProps> = ({
  label,
  value,
  delta,
  positive = true,
  active = false,
  onSelect,
  detail,
  realtimeModeEnabled = false,
}) => {
  const formattedValue = (() => {
    const raw = String(value ?? '').trim();
    if (!raw) return raw;

    const normalized = raw.replace(/,/g, '');
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return raw;

    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return raw;

    const decimals = normalized.includes('.') ? normalized.split('.')[1].length : 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numeric);
  })();

  const interactive = Boolean(onSelect);
  const detailText = detail || delta || 'More insight coming soon.';
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onSelect) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  const deltaStyle = positive
    ? {
        backgroundColor: 'rgba(34, 197, 94, 0.14)',
        border: '1px solid rgba(34, 197, 94, 0.30)',
        color: 'rgb(22, 163, 74)',
      }
    : {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.26)',
        color: 'rgb(220, 38, 38)',
      };

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`real-time-card relative overflow-hidden group rounded-[36px] border px-9 py-9 text-left transition flex flex-col gap-3 theme-panel ${
        active ? 'ring-2 translate-y-0' : 'hover:-translate-y-1'
      } ${interactive ? 'cursor-pointer focus:outline-none focus:ring-2' : ''}`}
      style={{
        borderColor: active ? 'var(--theme-text)' : 'var(--theme-border)',
        boxShadow: active ? 'var(--theme-card-shadow)' : 'var(--theme-card-shadow)',
      }}
      title={detailText}
    >
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase theme-muted gap2">
        <span>{label}</span>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: realtimeModeEnabled ? '#22c55e' : active ? 'var(--theme-text)' : 'var(--theme-border)',
          }}
        />
      </div>
      <p className="real-time-value text-[28px] leading-tight font-semibold theme-text -mt-2">{formattedValue}</p>
      <div
        className="real-time-delta inline-flex items-center gap-2 text-[11px] font-semibold px-4 py-2 rounded-full w-fit -mt-2"
        style={deltaStyle}
      >
        {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {delta}
      </div>
      <p className="real-time-subtitle text-[11px] theme-muted -mt-1">from last period</p>
    </div>
  );
};

export default RealTimeCard;
export type { RealTimeCardProps };
