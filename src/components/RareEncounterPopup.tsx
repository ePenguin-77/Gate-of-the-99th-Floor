import { Panel } from "./Panel";
import type { RareEncounter, RareEncounterRarity } from "../types/game";

interface RareEncounterPopupProps {
  encounter: RareEncounter;
  onChoose: (choiceId: string) => void;
}

const rarityLabels: Record<RareEncounterRarity, string> = {
  rare: "หายาก",
  veryRare: "หายากมาก",
  mythic: "แทบเป็นไปไม่ได้",
};

const outcomeStyles: Record<string, string> = {
  safe: "border-stone-300/20 bg-stone-200/5 text-stone-300",
  reward: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  risk: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  mixed: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  dangerous: "border-red-300/30 bg-red-400/10 text-red-100",
};

const outcomeLabels: Record<string, string> = {
  safe: "ปลอดภัยกว่า",
  reward: "อาจได้ประโยชน์",
  risk: "มีความเสี่ยง",
  mixed: "ผลลัพธ์ไม่แน่นอน",
  dangerous: "อันตราย",
};

export function RareEncounterPopup({ encounter, onChoose }: RareEncounterPopupProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_bottom,rgba(127,29,29,0.22),transparent_42%)]" />
      <Panel className="relative w-full max-w-3xl border-amber-300/40 bg-ash-900/95 p-5 shadow-2xl shadow-amber-950/40 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-200">
            เหตุการณ์ผิดปกติ
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
            {rarityLabels[encounter.rarity]}
          </span>
        </div>

        <div className="mt-5">
          <h2 className="font-serif text-3xl leading-tight text-stone-50 sm:text-4xl">{encounter.titleTh}</h2>
          {encounter.subtitleTh ? <p className="mt-2 text-base text-amber-200">{encounter.subtitleTh}</p> : null}
          <p className="mt-4 leading-8 text-stone-300">{encounter.descriptionTh}</p>
        </div>

        <div className="mt-6 grid gap-3">
          {encounter.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice.id)}
              className="group border border-white/10 bg-black/25 p-4 text-left transition hover:border-amber-300/50 hover:bg-amber-300/10 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl text-stone-50">{choice.labelTh}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-400">{choice.descriptionTh}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${outcomeStyles[choice.outcomeType]}`}>
                  {outcomeLabels[choice.outcomeType]}
                </span>
              </div>
              {choice.riskTh ? <p className="mt-3 text-xs leading-5 text-amber-100/80">ความเสี่ยง: {choice.riskTh}</p> : null}
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 text-sm leading-6 text-stone-500">
          เหตุการณ์แบบนี้ไม่ได้เกิดขึ้นบ่อย หอคอยไม่เผยด้านผิดปกติให้ทุกคนเห็น
        </div>
      </Panel>
    </div>
  );
}
