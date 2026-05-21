import { getShopBaseCost, shopItems } from "../game/shopSystem";
import { getShopCostForAction, getShopPriceMultiplierForAction, getTowerPressureEffects, isEssentialShopAction } from "../game/towerPressure";
import type { ShopActionId } from "../types/game";

interface MarketPanelProps {
  gold: number;
  towerPressure: number;
  currentFloor?: number;
  classId?: string;
  serviceCostMultipliers?: Partial<Record<ShopActionId, number>>;
  onBuy: (actionId: ShopActionId) => void;
}

export function MarketPanel({ gold, towerPressure, currentFloor = 1, classId, serviceCostMultipliers = {}, onBuy }: MarketPanelProps) {
  const priceMultiplier = getTowerPressureEffects(towerPressure).shopPriceMultiplier;
  const essentialMultiplier = getShopPriceMultiplierForAction("buy-food", towerPressure, currentFloor);

  return (
    <section className="border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-stone-100">ตลาดและบริการ</h2>
          <p className="mt-1 text-sm text-stone-400">ใช้ทองเพื่อซื้อเวลา รักษาร่างกาย หรือเตรียมตัวก่อนขึ้นหอคอย</p>
          {priceMultiplier > 1 ? <p className="mt-1 text-xs text-orange-200">ราคาสูงขึ้นจากความกดดันของหอคอย</p> : null}
          {priceMultiplier > essentialMultiplier ? (
            <p className="mt-1 text-xs text-emerald-200">ของจำเป็นยังถูกกดราคาไว้เล็กน้อย เพราะเมืองพักพิงยังไม่ทอดทิ้งผู้หลงทาง</p>
          ) : null}
        </div>
        <span className="border border-ember-300/30 px-3 py-1 text-sm text-ember-200">ทอง {gold}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shopItems.map((item) => {
          const stageBaseCost = getShopBaseCost(item.id, currentFloor);
          const baseCost = classId === "tinker" && item.id === "prepare-gear" ? Math.ceil(stageBaseCost * 0.85) : stageBaseCost;
          const npcMultiplier = serviceCostMultipliers[item.id] ?? 1;
          const finalCost = getShopCostForAction(item.id, Math.ceil(baseCost * npcMultiplier), towerPressure, currentFloor);
          return (
            <button
              key={item.id}
              onClick={() => onBuy(item.id)}
              className={`border p-3 text-left transition hover:bg-white/[0.08] ${
                gold < finalCost ? "border-red-300/25 bg-red-950/10" : "border-white/10 bg-ash-900/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-stone-100">{item.label}</span>
                <span className="shrink-0 text-sm text-ember-300">{finalCost} ทอง</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-400">{item.description}</p>
              {npcMultiplier < 1 ? <p className="mt-2 text-xs text-emerald-200">ความสัมพันธ์ที่ดีช่วยลดราคา</p> : null}
              {npcMultiplier > 1 ? <p className="mt-2 text-xs text-orange-200">ความไม่ไว้วางใจทำให้ราคาสูงขึ้น</p> : null}
              {priceMultiplier > 1 && isEssentialShopAction(item.id) ? <p className="mt-2 text-xs text-emerald-200">ของจำเป็นถูกกดราคาไว้ไม่ให้สูงเกินไป</p> : null}
              {classId === "tinker" && item.id === "prepare-gear" ? <p className="mt-2 text-xs text-ember-200">ช่างประดิษฐ์เตรียมอุปกรณ์ได้ถูกลงและมีประสิทธิภาพขึ้น</p> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
