import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

const variants = {
  primary: "border-ember-300/60 bg-ember-400 text-ash-900 hover:bg-ember-300",
  secondary: "border-white/15 bg-white/[0.08] text-stone-100 hover:bg-white/[0.14]",
  ghost: "border-transparent bg-transparent text-stone-300 hover:bg-white/[0.08] hover:text-stone-100",
  danger: "border-red-400/40 bg-red-950/40 text-red-100 hover:bg-red-900/50",
};

export function Button({ children, variant = "secondary", className = "", ...props }: ButtonProps) {
  const audioProps = props as ButtonHTMLAttributes<HTMLButtonElement> & { "data-audio-id"?: string };
  const defaultAudioId = variant === "primary" ? "ui_confirm" : variant === "danger" ? "ui_warning" : variant === "ghost" ? "ui_back" : "ui_click";
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-normal border px-5 py-2.5 text-center text-sm font-semibold leading-6 tracking-wide transition disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      data-audio-id={audioProps["data-audio-id"] ?? defaultAudioId}
      {...props}
    >
      {children}
    </button>
  );
}
