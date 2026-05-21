import { AlertTriangle, CheckCircle2, Info, Skull, X, XCircle } from "lucide-react";
import { useEffect } from "react";
import { playUiSound } from "../../game/audioSystem";

export interface ActionFeedback {
  id: string;
  type: "success" | "warning" | "error" | "info" | "critical";
  title: string;
  message: string;
  details?: string[];
  autoClose?: boolean;
  durationMs?: number;
}

interface ActionFeedbackPopupProps {
  feedback?: ActionFeedback;
  onClose: () => void;
}

const toneStyles: Record<ActionFeedback["type"], { card: string; icon: string; button: string }> = {
  success: {
    card: "border-emerald-300/35 bg-emerald-950/35 shadow-emerald-950/30",
    icon: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    button: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15",
  },
  warning: {
    card: "border-amber-300/45 bg-amber-950/35 shadow-amber-950/30",
    icon: "border-amber-300/35 bg-amber-300/10 text-amber-200",
    button: "border-amber-300/35 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15",
  },
  error: {
    card: "border-red-300/45 bg-red-950/35 shadow-red-950/30",
    icon: "border-red-300/35 bg-red-300/10 text-red-200",
    button: "border-red-300/35 bg-red-300/10 text-red-100 hover:bg-red-300/15",
  },
  info: {
    card: "border-sky-300/35 bg-sky-950/30 shadow-sky-950/25",
    icon: "border-sky-300/30 bg-sky-300/10 text-sky-200",
    button: "border-sky-300/30 bg-sky-300/10 text-sky-100 hover:bg-sky-300/15",
  },
  critical: {
    card: "border-red-300/60 bg-red-950/55 shadow-red-950/40",
    icon: "border-red-300/45 bg-red-300/10 text-red-100",
    button: "border-red-300/45 bg-red-300/10 text-red-100 hover:bg-red-300/20",
  },
};

export function ActionFeedbackPopup({ feedback, onClose }: ActionFeedbackPopupProps) {
  useEffect(() => {
    if (!feedback || feedback.type === "critical") return;
    const canAutoClose =
      feedback.autoClose === true ||
      (feedback.autoClose !== false && (feedback.type === "success" || feedback.type === "info"));
    if (!canAutoClose) return;
    const timeout = window.setTimeout(
      onClose,
      feedback.durationMs ?? (feedback.type === "success" || feedback.type === "info" ? 4200 : 7000),
    );
    return () => window.clearTimeout(timeout);
  }, [feedback, onClose]);

  useEffect(() => {
    if (!feedback) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [feedback, onClose]);

  if (!feedback) return null;

  const tone = toneStyles[feedback.type];
  const showBackdrop = feedback.type === "warning" || feedback.type === "error" || feedback.type === "critical";
  const handleClose = () => {
    playUiSound("ui_click");
    onClose();
  };

  return (
    <div className={`fixed inset-x-0 z-[80] flex justify-center px-4 ${showBackdrop ? "inset-y-0 items-center bg-black/25 backdrop-blur-[2px]" : "top-4 pointer-events-none items-start"}`}>
      <section
        role="status"
        aria-live={feedback.type === "success" || feedback.type === "info" ? "polite" : "assertive"}
        className={`pointer-events-auto relative flex max-h-[80vh] w-[min(100%,34rem)] flex-col rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${tone.card}`}
      >
        <button
          type="button"
          data-audio-silent="true"
          onClick={handleClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-stone-300 transition hover:border-white/25 hover:text-stone-100"
          aria-label="ปิดข้อความ"
        >
          <X size={16} />
        </button>
        <div className="flex min-h-0 gap-4 overflow-y-auto pr-8">
          <span className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${tone.icon}`}>
            {getFeedbackIcon(feedback.type)}
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-2xl leading-tight text-stone-100">{feedback.title}</h2>
            <p className="mt-2 text-sm leading-7 text-stone-300">{feedback.message}</p>
            {feedback.details && feedback.details.length > 0 ? (
              <ul className="mt-3 grid gap-1 text-sm leading-6 text-stone-300">
                {feedback.details.map((detail) => (
                  <li key={detail}>- {detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex shrink-0 justify-end">
          <button
            type="button"
            data-audio-silent="true"
            onClick={handleClose}
            className={`min-h-11 w-full rounded-xl border px-4 py-2 text-sm font-semibold transition sm:w-auto ${tone.button}`}
          >
            เข้าใจแล้ว
          </button>
        </div>
      </section>
    </div>
  );
}

function getFeedbackIcon(type: ActionFeedback["type"]) {
  if (type === "success") return <CheckCircle2 size={22} />;
  if (type === "warning") return <AlertTriangle size={22} />;
  if (type === "error") return <XCircle size={22} />;
  if (type === "critical") return <Skull size={22} />;
  return <Info size={22} />;
}
