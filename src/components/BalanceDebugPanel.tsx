interface BalanceDebugPanelProps {
  rows: Array<{ label: string; value: string | number }>;
}

export function BalanceDebugPanel({ rows }: BalanceDebugPanelProps) {
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  if (!isDev) return null;

  return (
    <details className="mt-3 border border-white/10 bg-black/30 p-3 text-xs text-stone-400">
      <summary className="cursor-pointer font-semibold text-stone-200">แผงจูนระบบ</summary>
      <div className="mt-3 grid gap-1 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 border border-white/10 px-2 py-1">
            <span>{row.label}</span>
            <span className="text-stone-100">{row.value}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
