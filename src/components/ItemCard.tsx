import type { Item } from "../types/game";
import { Button } from "./Button";

interface ItemCardProps {
  item: Item;
  quantity: number;
  equipped?: boolean;
  useful?: boolean;
  canUse?: boolean;
  canEquip?: boolean;
  onUse?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  onDrop?: () => void;
}

const rarityLabels = {
  common: "ทั่วไป",
  uncommon: "ไม่ธรรมดา",
  rare: "หายาก",
  anomaly: "ผิดปกติ",
};

const rarityClasses = {
  common: "border-stone-300/20 text-stone-300",
  uncommon: "border-sky-300/25 text-sky-200",
  rare: "border-amber-300/30 text-amber-200",
  anomaly: "border-fuchsia-300/35 text-fuchsia-200",
};

export function ItemCard({ item, quantity, equipped, useful, canUse, canEquip, onUse, onEquip, onUnequip, onDrop }: ItemCardProps) {
  return (
    <div className={`border bg-black/25 p-4 ${equipped ? "border-ember-300/50" : "border-white/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl text-stone-100">{item.nameTh}</h3>
          <p className="text-sm text-stone-500">x{quantity}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs ${rarityClasses[item.rarity]}`}>{rarityLabels[item.rarity]}</span>
          {equipped ? <span className="rounded-full border border-ember-300/30 bg-ember-300/10 px-2.5 py-1 text-xs text-ember-100">พกอยู่</span> : null}
          {useful ? <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">เหมาะกับสถานการณ์</span> : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-stone-300">{item.descriptionTh}</p>
      {item.drawbackTh ? <p className="mt-2 text-xs leading-6 text-orange-200">ข้อแลกเปลี่ยน: {item.drawbackTh}</p> : null}
      {item.flavorTh ? <p className="mt-2 text-xs leading-6 text-stone-500">{item.flavorTh}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-400">
        {item.tags.map((tag) => (
          <span key={tag} className="border border-white/10 bg-white/5 px-2 py-1">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {canUse ? <Button variant="primary" onClick={onUse}>ใช้</Button> : null}
        {equipped ? <Button onClick={onUnequip}>เอาออกจากช่องพก</Button> : canEquip ? <Button onClick={onEquip}>พกขึ้นหอคอย</Button> : null}
        {item.type !== "quest" ? <Button variant="ghost" onClick={onDrop}>ทิ้ง</Button> : null}
      </div>
    </div>
  );
}
