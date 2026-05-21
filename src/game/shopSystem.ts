import { statLabels } from "./labels";
import { getNpcServiceCostMultiplier } from "./npcSystem";
import { getCurrentTowerFloor, getShopCostForAction } from "./towerPressure";
import { addItem } from "./inventorySystem";
import type { Character, GameState, ShopActionId, ShopItem } from "../types/game";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const statKeys = ["strength", "agility", "endurance", "focus", "willpower", "instinct"] as const;

export const shopItems: ShopItem[] = [
  { id: "buy-food", label: "ซื้ออาหาร", cost: 5, description: "ซื้อเสบียงหนึ่งส่วนสำหรับประทังชีวิต" },
  { id: "buy-bandage", label: "ซื้อผ้าพันแผล", cost: 12, description: "ลดอาการบาดเจ็บเล็กน้อย" },
  { id: "buy-medicine", label: "ซื้อยา", cost: 14, description: "ลดอาการป่วยเล็กน้อย" },
  { id: "buy-dry-bread", label: "ซื้อขนมปังแห้ง", cost: 8, description: "เพิ่มไอเทมขนมปังแห้ง ใช้ประทังความหิวได้ทั้งในเมืองและหอคอย" },
  { id: "buy-rough-bandage", label: "ซื้อผ้าพันแผลหยาบ", cost: 12, description: "เพิ่มไอเทมผ้าพันแผลหยาบ ใช้ลดอาการบาดเจ็บยามฉุกเฉิน" },
  { id: "buy-bitter-medicine", label: "ซื้อยาขม", cost: 14, description: "เพิ่มไอเทมยาขม ใช้ลดอาการป่วย แม้รสชาติจะทำร้ายใจ" },
  { id: "buy-old-rope", label: "ซื้อเชือกเก่า", cost: 18, description: "อุปกรณ์สำหรับพกขึ้นหอคอย ลดความเสี่ยงจากกับดัก สะพาน หรือหลุม" },
  { id: "buy-cracked-lantern", label: "ซื้อตะเกียงร้าว", cost: 20, description: "อุปกรณ์สำหรับชั้นมืด เพิ่มโอกาสรอดจากความกลัวและเงา" },
  { id: "inn-rest", label: "พักโรงเตี๊ยม", cost: 10, description: "ฟื้นความเหนื่อยล้าได้มากกว่าการพักธรรมดา แต่ต้องใช้ทอง" },
  { id: "trainer", label: "ฝึกกับครูฝึก", cost: 18, description: "เพิ่มค่าสถานะอย่างมั่นคง แต่ใช้ทองและแรงกาย" },
  { id: "prepare-gear", label: "เตรียมอุปกรณ์ขึ้นหอคอย", cost: 22, description: "ลดความเสี่ยงในการท้าทายชั้นถัดไปหนึ่งครั้ง" },
];

export function getShopBaseCost(actionId: ShopActionId, floorNumber = 1): number {
  if (actionId === "inn-rest") return floorNumber >= 11 ? 18 : floorNumber >= 4 ? 14 : 10;
  if (actionId === "trainer") return floorNumber >= 11 ? 24 : 18;
  if (actionId === "prepare-gear") return floorNumber >= 11 ? 30 : 22;
  return shopItems.find((entry) => entry.id === actionId)?.cost ?? 0;
}

export function getFinalShopCost(state: GameState, actionId: ShopActionId): number {
  const item = shopItems.find((entry) => entry.id === actionId);
  if (!item || !state.character) return 0;
  const floorNumber = getCurrentTowerFloor(state);
  const baseCost = getShopBaseCost(actionId, floorNumber);
  const tinkerCost = state.character.classId === "tinker" && actionId === "prepare-gear" ? Math.ceil(baseCost * 0.85) : baseCost;
  const serviceKey = actionId === "inn-rest" ? "innRest" : actionId === "buy-bandage" ? "treatInjury" : actionId === "buy-medicine" ? "treatSickness" : actionId === "prepare-gear" ? "prepareEquipment" : "";
  const npcMultiplier = serviceKey ? getNpcServiceCostMultiplier(state, serviceKey) : 1;
  return getShopCostForAction(actionId, Math.ceil(tinkerCost * npcMultiplier), state.towerPressure ?? 0, floorNumber);
}

export function applyShopAction(state: GameState, actionId: ShopActionId): { state: GameState; activityName: string; narrative: string; ok: boolean } {
  if (!state.character) return { state, activityName: "ตลาดและบริการ", narrative: "ไม่มีผู้หลงทางให้ดูแล", ok: false };
  const item = shopItems.find((entry) => entry.id === actionId);
  if (!item) return { state, activityName: "ตลาดและบริการ", narrative: "ไม่พบการบริการนี้", ok: false };
  const finalCost = getFinalShopCost(state, actionId);
  if (state.character.gold < finalCost) {
    return { state, activityName: item.label, narrative: "ทองไม่พอสำหรับการกระทำนี้", ok: false };
  }

  const character: Character = structuredClone(state.character);
  character.gold -= finalCost;
  let narrative = "";
  let preparationBuff = state.preparationBuff;
  let nextState: GameState = { ...state, character };

  if (actionId === "buy-food") {
    character.food += 1;
    narrative = `${character.name} ซื้อเสบียงหนึ่งส่วน กลิ่นขนมปังแข็งยังดีกว่าความว่างเปล่าในท้อง`;
  }
  const itemPurchases: Partial<Record<ShopActionId, string>> = {
    "buy-dry-bread": "dry_bread",
    "buy-rough-bandage": "rough_bandage",
    "buy-bitter-medicine": "bitter_medicine",
    "buy-old-rope": "old_rope",
    "buy-cracked-lantern": "cracked_lantern",
  };
  if (itemPurchases[actionId]) {
    const itemResult = addItem(nextState, itemPurchases[actionId]!, 1);
    if (!itemResult.ok) {
      return {
        state,
        activityName: item.label,
        narrative: itemResult.message,
        ok: false,
      };
    }
    nextState = itemResult.state;
    const boughtItem = nextState.character?.inventory.find((entry) => entry.itemId === itemPurchases[actionId]);
    narrative = `${character.name} ซื้อไอเทมจากตลาด ได้รับของที่อาจซื้อเวลาให้เขาได้อีกเล็กน้อย ${itemResult.message}${boughtItem ? "" : ""}`;
  }
  if (actionId === "buy-bandage") {
    character.survival.injury = clamp(character.survival.injury - 20);
    narrative = `${character.name} พันแผลใหม่อย่างระมัดระวัง บาดแผลยังอยู่ แต่ไม่กรีดร้องเท่าเดิม`;
  }
  if (actionId === "buy-medicine") {
    character.survival.sickness = clamp(character.survival.sickness - 20);
    narrative = `${character.name} กลืนยาขมลงไป สีหน้าของเขาดีขึ้นเล็กน้อยแม้รสชาติจะเหมือนคำเตือน`;
  }
  if (actionId === "inn-rest") {
    character.survival.fatigue = clamp(character.survival.fatigue - 55);
    character.survival.morale = clamp(character.survival.morale + 8);
    character.survival.hunger = clamp(character.survival.hunger - 12);
    character.survival.injury = clamp(character.survival.injury - 3);
    character.survival.sickness = clamp(character.survival.sickness - 3);
    narrative = `${character.name} พักในโรงเตี๊ยมที่ยังมีหลังคาและไฟอุ่น ร่างกายได้ลืมความหนาวของหอคอยไปชั่วคืน`;
  }
  if (actionId === "trainer") {
    const stat = statKeys[Math.floor(Math.random() * statKeys.length)];
    character.stats[stat] = clamp(character.stats[stat] + 1, 1, 25);
    character.survival.fatigue = clamp(character.survival.fatigue + 10);
    character.survival.hunger = clamp(character.survival.hunger + 8);
    narrative = `${character.name} ฝึกกับครูฝึกจนจับจังหวะของตนเองได้ดีขึ้น ${statLabels[stat]} เพิ่มขึ้น`;
  }
  if (actionId === "prepare-gear") {
    preparationBuff = {
      successBonus: character.classId === "tinker" ? 8 : 5,
      injuryRiskReduction: character.classId === "tinker" ? 14 : 10,
      expiresAfterNextTower: true,
    };
    narrative = `${character.name} ตรวจอุปกรณ์ เชือก ผ้าพันแผล และคบเพลิง ทุกอย่างอาจซื้อเวลาให้เขาได้อีกหนึ่งลมหายใจ`;
  }

  return {
    state: {
      ...nextState,
      character: nextState.character ?? character,
      preparationBuff,
      consecutiveActivity: { type: actionId, count: 1 },
    },
    activityName: item.label,
    narrative,
    ok: true,
  };
}
