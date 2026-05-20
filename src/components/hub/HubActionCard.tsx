import type { ReactNode } from "react";

interface HubActionCardProps {
  icon: ReactNode;
  label: string;
  preview: string;
  cost?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "secondary" | "primary" | "danger";
}

export function HubActionCard({ icon, label, preview, cost, onClick, disabled, variant = "secondary" }: HubActionCardProps) {
  const variantClass =
    variant === "primary"
      ? "border-ember-300/35 bg-ember-300/10 hover:border-ember-300/60 hover:bg-ember-300/15"
      : variant === "danger"
        ? "border-red-300/25 bg-red-950/15 hover:border-red-300/45 hover:bg-red-950/25"
        : "border-white/10 bg-white/[0.045] hover:border-ember-300/35 hover:bg-ember-300/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex min-h-[7rem] w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${variantClass}`}
    >
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ember-300/20 bg-black/30 text-ember-200 transition group-hover:border-ember-300/50">
        {icon}
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="text-[0.95rem] font-semibold leading-6 text-stone-100">{label}</span>
        <span className="text-sm leading-6 text-stone-400">{preview}</span>
        {cost ? <span className="text-xs leading-5 text-ember-200/85">{cost}</span> : null}
      </span>
    </button>
  );
}
