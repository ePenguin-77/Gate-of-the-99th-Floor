import { ArrowLeft, Backpack } from "lucide-react";
import { ItemCard } from "../components/ItemCard";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { getItem, normalizeInventory } from "../game/inventorySystem";
import type { Character } from "../types/game";

interface InventoryScreenProps {
  character: Character;
  message?: string;
  onUseItem: (itemId: string) => void;
  onEquipItem: (itemId: string) => void;
  onUnequipItem: (itemId: string) => void;
  onDropItem: (itemId: string) => void;
  onBack: () => void;
}

export function InventoryScreen({ character, message, onUseItem, onEquipItem, onUnequipItem, onDropItem, onBack }: InventoryScreenProps) {
  const inventory = normalizeInventory(character.inventory);
  const equipped = character.equippedItems ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">กระเป๋า</p>
          <h1 className="mt-1 flex items-center gap-3 font-serif text-5xl text-stone-100">
            <Backpack className="text-ember-300" /> ของที่ยังพอช่วยให้รอด
          </h1>
          <p className="mt-2 text-sm leading-7 text-stone-400">
            เลือกว่าจะใช้ตอนนี้ หรือพกขึ้นหอคอยไว้ใช้ในจังหวะที่ไม่มีเวลาเสียใจ
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} /> กลับเมืองพักพิง
        </Button>
      </header>

      {message ? (
        <Panel className="mb-5 border-ember-300/30 bg-ember-300/10 p-4 text-sm leading-7 text-ember-100">{message}</Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <Panel className="p-5">
          <h2 className="font-serif text-2xl text-stone-100">ภาพรวม</h2>
          <div className="mt-4 grid gap-3">
            <SummaryRow label="กระเป๋า" value={`${inventory.length}/${character.inventoryLimit ?? 8}`} />
            <SummaryRow label="ของที่พกขึ้นหอคอย" value={`${equipped.length}/3`} />
          </div>
          <div className="mt-5 border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-medium tracking-wide text-ember-300">ของที่พกอยู่</p>
            {equipped.length === 0 ? (
              <p className="mt-2 text-sm leading-7 text-stone-400">ยังไม่ได้พกอะไรขึ้นหอคอย</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {equipped.map((itemId) => {
                  const item = getItem(itemId);
                  if (!item) return null;
                  return (
                    <div key={itemId} className="border border-ember-300/20 bg-black/25 p-3">
                      <p className="font-serif text-xl text-stone-100">{item.nameTh}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">{item.descriptionTh}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-serif text-2xl text-stone-100">รายการไอเทม</h2>
          {inventory.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-stone-400">กระเป๋ายังว่างเปล่า เมืองนี้ไม่แจกทางรอดให้ใครฟรีๆ</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {inventory.map((entry) => {
                const item = getItem(entry.itemId);
                if (!item) return null;
                const isEquipped = equipped.includes(item.id);
                return (
                  <ItemCard
                    key={entry.itemId}
                    item={item}
                    quantity={entry.quantity}
                    equipped={isEquipped}
                    canUse={Boolean(item.usableInHub)}
                    canEquip={Boolean(item.usableInTower)}
                    onUse={() => onUseItem(item.id)}
                    onEquip={() => onEquipItem(item.id)}
                    onUnequip={() => onUnequipItem(item.id)}
                    onDrop={() => onDropItem(item.id)}
                  />
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-stone-400">{label}</span>
      <span className="font-serif text-2xl text-ember-300">{value}</span>
    </div>
  );
}
