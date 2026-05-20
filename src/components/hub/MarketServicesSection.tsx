import { ChevronDown } from "lucide-react";
import { MarketPanel } from "../MarketPanel";
import type { Character, ShopActionId } from "../../types/game";

interface MarketServicesSectionProps {
  character: Character;
  towerPressure: number;
  serviceCostMultipliers?: Partial<Record<ShopActionId, number>>;
  onShopAction: (actionId: ShopActionId) => void;
}

export function MarketServicesSection({ character, towerPressure, serviceCostMultipliers, onShopAction }: MarketServicesSectionProps) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-black/25 shadow-xl shadow-black/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="font-serif text-xl text-stone-100 sm:text-2xl">ตลาดและบริการ</h2>
          <p className="mt-1 max-w-[720px] text-sm leading-6 text-stone-400">
            ซื้อเสบียง รักษาอาการบาดเจ็บ รักษาอาการป่วย หรือเตรียมอุปกรณ์
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-ember-300/25 bg-ember-300/10 px-3 py-1 text-xs font-semibold text-ember-200">
          เปิดตลาดและบริการ <ChevronDown size={14} className="transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-white/10 p-4 sm:p-5">
        <MarketPanel
          gold={character.gold}
          towerPressure={towerPressure}
          classId={character.classId}
          serviceCostMultipliers={serviceCostMultipliers}
          onBuy={onShopAction}
        />
      </div>
    </details>
  );
}
