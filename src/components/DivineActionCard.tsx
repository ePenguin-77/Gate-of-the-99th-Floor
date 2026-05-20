import type { ElementType } from "react";
import { playDivineActionSound } from "../game/audioSystem";
import type { DivineAction } from "../types/game";

interface DivineActionCardProps {
  action: DivineAction;
  icon: ElementType;
  selected: boolean;
  floorHint?: string;
  onSelect: () => void;
}

export function DivineActionCard({ action, icon: Icon, selected, floorHint, onSelect }: DivineActionCardProps) {
  function handleSelect() {
    playDivineActionSound(action.id);
    onSelect();
  }

  return (
    <button
      data-audio-id="ui_tab"
      onClick={handleSelect}
      className={`border p-4 text-left transition ${
        selected ? "border-ember-300 bg-ember-300/10 shadow-[0_0_24px_rgba(245,158,11,0.12)]" : "border-white/10 bg-black/20 hover:bg-white/[0.08]"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-stone-100">
        <Icon size={18} className="text-ember-300" />
        <span className="font-semibold">{action.nameTh}</span>
      </div>
      <p className="text-sm leading-6 text-stone-400">{action.descriptionTh}</p>

      <div className="mt-4 border border-white/10 bg-ash-900/70 p-3">
        <p className="text-xs font-semibold tracking-wide text-ember-300">ผลที่อาจเกิดขึ้น</p>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-stone-300">
          <PreviewRow label="โอกาสช่วยผ่านเหตุการณ์" value={action.chancePreviewTh} />
          <PreviewRow label="ผลดี" value={action.benefitPreviewTh} />
          <PreviewRow label="ความเสี่ยง" value={action.riskPreviewTh} />
          <PreviewRow label="ค่าที่อาจเปลี่ยน" value={action.possibleChangesTh.join(", ")} />
        </div>
      </div>

      {floorHint ? (
        <div className="mt-3 border border-sky-300/25 bg-sky-950/15 px-3 py-2 text-xs leading-5 text-sky-100">
          เหมาะกับชั้นนี้: {floorHint}
        </div>
      ) : null}
    </button>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
      <span className="text-stone-500">{label}:</span>
      <span className="text-stone-200">{value}</span>
    </div>
  );
}
