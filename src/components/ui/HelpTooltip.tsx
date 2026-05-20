import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HelpTooltipProps {
  title: string;
  text: string;
  note?: string;
  ariaLabel?: string;
}

interface TooltipPosition {
  top: number;
  left: number;
}

const TOOLTIP_WIDTH = 320;
const VIEWPORT_MARGIN = 12;

export function HelpTooltip({ title, text, note, ariaLabel }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const estimatedHeight = 190;
    const showAbove = rect.bottom + estimatedHeight + VIEWPORT_MARGIN > window.innerHeight && rect.top > estimatedHeight;
    const left = Math.min(Math.max(rect.right - width, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);
    const top = showAbove ? Math.max(rect.top - estimatedHeight - 8, VIEWPORT_MARGIN) : Math.min(rect.bottom + 8, window.innerHeight - VIEWPORT_MARGIN);
    setPosition({ top, left });
  };

  const show = (pin = false) => {
    updatePosition();
    setOpen(true);
    if (pin) setPinned(true);
  };

  const hide = () => {
    setOpen(false);
    setPinned(false);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      hide();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    const onResize = () => updatePosition();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel ?? `อธิบาย${title}`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          if (open && pinned) hide();
          else show(true);
        }}
        onMouseEnter={() => show(false)}
        onMouseLeave={() => {
          if (!pinned) setOpen(false);
        }}
        onFocus={() => show(false)}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-ember-300/45 bg-black/45 text-[0.68rem] font-bold leading-none text-ember-100 opacity-95 shadow-[0_0_10px_rgba(217,140,58,0.12)] transition hover:border-ember-200 hover:bg-ember-300/15 hover:text-amber-50 hover:opacity-100 hover:shadow-[0_0_16px_rgba(217,140,58,0.34)] focus:outline-none focus-visible:border-ember-200 focus-visible:text-amber-50 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ember-300/35"
      >
        !
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              style={{ top: position.top, left: position.left, width: Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2) }}
              className="fixed z-[90] rounded-xl border border-ember-300/25 border-t-ember-300/70 bg-zinc-950/95 p-4 text-left shadow-2xl shadow-black/55 backdrop-blur-md"
            >
              <p className="font-serif text-lg text-ember-100">{title}</p>
              <p className="mt-2 text-sm leading-7 text-stone-200">{text}</p>
              {note ? <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-6 text-stone-400">{note}</p> : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
