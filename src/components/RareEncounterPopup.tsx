import { Panel } from "./Panel";
import { EncounterChoiceCard } from "./ui/EncounterChoiceCard";
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
            <EncounterChoiceCard
              key={choice.id}
              labelTh={choice.labelTh}
              descriptionTh={choice.descriptionTh}
              preview={choice.preview}
              riskTh={choice.riskTh}
              outcomeType={choice.outcomeType}
              onChoose={() => onChoose(choice.id)}
            />
          ))}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 text-sm leading-6 text-stone-500">
          ผลลัพธ์จริงยังขึ้นอยู่กับค่าสถานะ Trait ความทรงจำ และความกดดันของหอคอย
        </div>
      </Panel>
    </div>
  );
}
