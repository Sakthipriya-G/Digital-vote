import React from 'react';

export interface ChartDatum {
  label: string;
  count: number;
}

const PALETTE = ['#0F2544', '#1D4ED8', '#D97706', '#0F766E', '#4338CA', '#DC2626'];

export function HorizontalBarChart({
  title,
  subtitle,
  data,
  accentColor = '#1D4ED8',
}: {
  title: string;
  subtitle?: string;
  data: ChartDatum[];
  accentColor?: string;
}) {
  const maxVal = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No records recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, idx) => {
            const pct = Math.round((item.count / maxVal) * 100);
            return (
              <div key={`${item.label}-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate pr-2 font-medium text-slate-700">{item.label}</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">{item.count}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DonutDistributionChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: ChartDatum[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No distribution data available.</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="18" />
              {data.map((d, idx) => {
                const dash = (d.count / total) * circumference;
                const offset = -cumulative;
                cumulative += dash;
                return (
                  <circle
                    key={`${d.label}-${idx}`}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={PALETTE[idx % PALETTE.length]}
                    strokeWidth="18"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={offset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold tabular-nums text-slate-900">{total}</span>
              <span className="text-[11px] font-medium text-slate-500">Total</span>
            </div>
          </div>

          <div className="w-full space-y-2">
            {data.map((d, idx) => {
              const pct = Math.round((d.count / total) * 100);
              return (
                <div key={`${d.label}-${idx}`} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                    />
                    <span className="truncate font-medium text-slate-700">{d.label}</span>
                  </div>
                  <span className="ml-2 shrink-0 font-mono tabular-nums text-slate-900">
                    {d.count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrendColumnChart({
  title,
  subtitle,
  data,
  barColor = '#0F2544',
}: {
  title: string;
  subtitle?: string;
  data: ChartDatum[];
  barColor?: string;
}) {
  const maxVal = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No trend records available.</p>
      ) : (
        <div className="flex h-44 items-end gap-2 border-b border-slate-200 pt-4">
          {data.slice(-10).map((d, idx) => {
            const heightPct = Math.max(8, Math.round((d.count / maxVal) * 100));
            return (
              <div key={`${d.label}-${idx}`} className="flex flex-1 flex-col items-center justify-end gap-1.5 h-full min-w-0">
                <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-700">{d.count}</span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[28px] rounded-t transition-all duration-300"
                    style={{ height: `${heightPct}%`, backgroundColor: barColor }}
                    title={`${d.label}: ${d.count}`}
                  />
                </div>
                <span className="w-full truncate text-center font-mono text-[10px] text-slate-500">
                  {d.label.length > 7 ? d.label.slice(5) : d.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
