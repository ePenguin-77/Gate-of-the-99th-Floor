interface MeterProps {
  label: string;
  value: number;
  inverse?: boolean;
}

export function Meter({ label, value, inverse = false }: MeterProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const danger = inverse ? safeValue > 70 : safeValue < 30;
  const good = inverse ? safeValue < 35 : safeValue > 65;
  const color = danger ? "bg-red-500" : good ? "bg-emerald-400" : "bg-ember-300";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium tracking-wide text-stone-400">
        <span>{label}</span>
        <span>{safeValue}</span>
      </div>
      <div className="h-2 border border-white/10 bg-black/40">
        <div className={`h-full ${color}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
