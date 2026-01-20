import React from 'react';

type StatConfig = {
  label: string;
  value: string;
  helper?: string;
};

const StatCard: React.FC<StatConfig> = ({ label, value, helper }) => {
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

  return (
    <div className="theme-panel rounded-2xl px-4 py-5">
      <p className="text-xs font-semibold theme-muted uppercase ">{label}</p>
      <p className="mt-2 text-3xl font-semibold theme-text">{formattedValue}</p>
      {helper && <p className="text-xs theme-muted">{helper}</p>}
    </div>
  );
};

export default StatCard;
export type { StatConfig };
