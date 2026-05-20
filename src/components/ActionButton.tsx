import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "./Button";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  preview: string;
  variant?: "primary" | "secondary";
}

export function ActionButton({ icon, label, preview, variant = "secondary", ...props }: ActionButtonProps) {
  return (
    <Button variant={variant} className="min-h-[4.5rem] w-full justify-start px-4 text-left" {...props}>
      <span className="shrink-0">{icon}</span>
      <span className="grid gap-0.5">
        <span className="text-sm font-semibold leading-5">{label}</span>
        <span className="text-xs font-normal leading-5 opacity-80">{preview}</span>
      </span>
    </Button>
  );
}
