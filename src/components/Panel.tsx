import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = "" }: PanelProps) {
  return <section className={`border border-white/10 bg-ash-800/80 shadow-glow backdrop-blur ${className}`}>{children}</section>;
}
