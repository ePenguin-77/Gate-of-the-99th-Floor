import { items } from "../data/items";
import type { Character, GameState, InventoryItem, Item } from "../types/game";

export interface ItemUseResult {
  state: GameState;
  ok: boolean;
  message: string;
}

const MAX_EQUIPPED_ITEMS = 3;

export function getItem(itemId: string): Item | undefined {
  return items.find((item) => item.id === itemId);
}

export function normalizeInventory(inventory?: InventoryItem[]): InventoryItem[] {
  return (inventory ?? []).filter((entry) => getItem(entry.itemId) && entry.quantity > 0);
}

export function addItem(gameState: GameState, itemId: string, quantity = 1): ItemUseResult {
  if (!gameState.character) return { state: gameState, ok: false, message: "ไม่มีผู้หลงทางให้ดูแล" };
  const item = getItem(itemId);
  if (!item) return { state: gameState, ok: false, message: "ไม่พบไอเทมนี้" };
  const inventory = normalizeInventory(gameState.character.inventory);
  const existing = inventory.find((entry) => entry.itemId === itemId);
  if (!existing && inventory.length >= (gameState.character.inventoryLimit ?? 8)) {
    return { state: gameState, ok: false, message: "กระเป๋าเต็ม ไม่สามารถเก็บของเพิ่มได้" };
  }
  const nextInventory = existing
    ? inventory.map((entry) =>
        entry.itemId === itemId ? { ...entry, quantity: Math.min(item.maxStack, entry.quantity + quantity) } : entry,
      )
    : [...inventory, { itemId, quantity: Math.min(item.maxStack, quantity) }];
  return {
    state: {
      ...gameState,
      character: {
        ...gameState.character,
        inventory: nextInventory,
      },
    },
    ok: true,
    message: `ได้รับไอเทม: ${item.nameTh} x${quantity}`,
  };
}

export function removeItem(gameState: GameState, itemId: string, quantity = 1): GameState {
  if (!gameState.character) return gameState;
  const inventory = normalizeInventory(gameState.character.inventory)
    .map((entry) => (entry.itemId === itemId ? { ...entry, quantity: entry.quantity - quantity } : entry))
    .filter((entry) => entry.quantity > 0);
  const equippedItems = (gameState.character.equippedItems ?? []).filter((id) => id !== itemId || inventory.some((entry) => entry.itemId === id));
  return {
    ...gameState,
    character: {
      ...gameState.character,
      inventory,
      equippedItems,
    },
  };
}

export function hasItem(gameState: GameState, itemId: string, quantity = 1): boolean {
  return Boolean(gameState.character?.inventory?.some((entry) => entry.itemId === itemId && entry.quantity >= quantity));
}

export function equipItem(gameState: GameState, itemId: string): ItemUseResult {
  if (!gameState.character) return { state: gameState, ok: false, message: "ไม่มีผู้หลงทางให้ดูแล" };
  const item = getItem(itemId);
  if (!item) return { state: gameState, ok: false, message: "ไม่พบไอเทมนี้" };
  if (!hasItem(gameState, itemId)) return { state: gameState, ok: false, message: "ไม่มีไอเทมนี้ในกระเป๋า" };
  if ((gameState.character.equippedItems ?? []).includes(itemId)) return { state: gameState, ok: true, message: `${item.nameTh} อยู่ในช่องพกแล้ว` };
  if ((gameState.character.equippedItems ?? []).length >= MAX_EQUIPPED_ITEMS) return { state: gameState, ok: false, message: "ช่องของที่พกขึ้นหอคอยเต็มแล้ว" };
  return {
    state: {
      ...gameState,
      character: {
        ...gameState.character,
        equippedItems: [...(gameState.character.equippedItems ?? []), itemId],
      },
    },
    ok: true,
    message: `พกขึ้นหอคอย: ${item.nameTh}`,
  };
}

export function unequipItem(gameState: GameState, itemId: string): GameState {
  if (!gameState.character) return gameState;
  return {
    ...gameState,
    character: {
      ...gameState.character,
      equippedItems: (gameState.character.equippedItems ?? []).filter((id) => id !== itemId),
    },
  };
}

export function getEquippedItems(gameState: GameState): Item[] {
  return (gameState.character?.equippedItems ?? []).map((id) => getItem(id)).filter(Boolean) as Item[];
}

export function getUsableItemsForContext(gameState: GameState, contextTags: string[], inTower = false): Item[] {
  const owned = normalizeInventory(gameState.character?.inventory);
  return owned
    .map((entry) => getItem(entry.itemId))
    .filter((item): item is Item => Boolean(item))
    .filter((item) => (inTower ? item.usableInTower && gameState.character?.equippedItems?.includes(item.id) : item.usableInHub))
    .sort((a, b) => Number(hasRelevantTag(b, contextTags)) - Number(hasRelevantTag(a, contextTags)));
}

export function getItemEffectsForContext(gameState: GameState, contextTags: string[]): { successBonus: number; injuryRiskReduction: number; reasons: string[] } {
  if (!gameState.character) return { successBonus: 0, injuryRiskReduction: 0, reasons: [] };
  return getItemEffectsForCharacter(gameState.character, contextTags);
}

export function getItemEffectsForCharacter(character: Character, contextTags: string[]): { successBonus: number; injuryRiskReduction: number; criticalProtection: boolean; reasons: string[] } {
  let successBonus = 0;
  let injuryRiskReduction = 0;
  let criticalProtection = false;
  const reasons: string[] = [];
  (character.equippedItems ?? []).map((id) => getItem(id)).filter(Boolean).forEach((item) => {
    if (!item) return;
    item.effects?.forEach((effect) => {
      if (effect.contextTags && !effect.contextTags.some((tag) => contextTags.includes(tag))) return;
      if (effect.type === "successBonus") {
        successBonus += effect.value;
        reasons.push(`${item.nameTh}ช่วยเพิ่มโอกาสผ่าน`);
      }
      if (effect.type === "injuryRiskReduction") {
        injuryRiskReduction += effect.value;
        reasons.push(`${item.nameTh}ช่วยลดความเสี่ยงบาดเจ็บ`);
      }
      if (effect.type === "criticalFailureProtection") {
        criticalProtection = true;
        reasons.push(`${item.nameTh}อาจกันความล้มเหลวรุนแรง`);
      }
    });
    if (item.id === "gatekeeper_mask_shard" && contextTags.some((tag) => ["boss", "gate", "floor-10"].includes(tag))) {
      reasons.push("เศษหน้ากากผู้เฝ้าประตูสั่นเบาๆ เมื่อเข้าใกล้ประตู");
    }
  });
  return { successBonus, injuryRiskReduction, criticalProtection, reasons };
}

export function useItem(gameState: GameState, itemId: string, context: { inTower?: boolean; contextTags?: string[] } = {}): ItemUseResult {
  if (!gameState.character) return { state: gameState, ok: false, message: "ไม่มีผู้หลงทางให้ดูแล" };
  const item = getItem(itemId);
  if (!item) return { state: gameState, ok: false, message: "ไม่พบไอเทมนี้" };
  if (!hasItem(gameState, itemId)) return { state: gameState, ok: false, message: "ไม่มีไอเทมนี้ในกระเป๋า" };
  if (context.inTower && !item.usableInTower) return { state: gameState, ok: false, message: "ไอเทมนี้ใช้กลางหอคอยไม่ได้" };
  if (!context.inTower && !item.usableInHub) return { state: gameState, ok: false, message: "ไอเทมนี้ยังใช้ที่เมืองพักพิงไม่ได้" };

  let nextState = structuredClone(gameState) as GameState;
  if (!nextState.character) return { state: gameState, ok: false, message: "ไม่มีผู้หลงทางให้ดูแล" };
  const survival = nextState.character.survival;
  item.effects?.forEach((effect) => {
    if (effect.contextTags && !effect.contextTags.some((tag) => (context.contextTags ?? []).includes(tag))) return;
    if (effect.type === "hunger") survival.hunger = clamp(survival.hunger + effect.value);
    if (effect.type === "injury") survival.injury = clamp(survival.injury + effect.value);
    if (effect.type === "sickness") survival.sickness = clamp(survival.sickness + effect.value);
    if (effect.type === "morale") survival.morale = clamp(survival.morale + effect.value);
    if (effect.type === "hope") survival.hope = clamp(survival.hope + effect.value);
    if (effect.type === "towerPressure") nextState.towerPressure = clamp((nextState.towerPressure ?? 0) + effect.value, 0, 20);
  });
  if (context.inTower && item.id === "rough_bandage") survival.fatigue = clamp(survival.fatigue + 3);
  if (item.consumable) nextState = removeItem(nextState, itemId, 1);
  return { state: nextState, ok: true, message: `ใช้: ${item.nameTh} x1` };
}

export function getUsefulEquippedItemHints(gameState: GameState, contextTags: string[]): string[] {
  if (!gameState.character) return [];
  return getUsefulEquippedItemHintsForCharacter(gameState.character, contextTags);
}

export function getUsefulEquippedItemHintsForCharacter(character: Character, contextTags: string[]): string[] {
  const hints: string[] = [];
  (character.equippedItems ?? []).map((id) => getItem(id)).filter(Boolean).forEach((item) => {
    if (!item) return;
    if (item.id === "cracked_lantern" && contextTags.some((tag) => ["darkness", "fear"].includes(tag))) hints.push("ตะเกียงร้าว: ลดความเสี่ยงจากความมืด");
    if (item.id === "old_rope" && contextTags.some((tag) => ["trap", "pit", "bridge", "climb"].includes(tag))) hints.push("เชือกเก่า: ลดความเสี่ยงจากการตกหรือกับดัก");
    if (item.id === "broken_charm") hints.push("เครื่องรางแตก: อาจกันความล้มเหลวรุนแรงหนึ่งครั้ง");
    if (item.id === "gatekeeper_mask_shard" && contextTags.some((tag) => ["boss", "gate", "floor-10"].includes(tag))) hints.push("เศษหน้ากากผู้เฝ้าประตู: ช่วยในเหตุการณ์เกี่ยวกับประตู");
  });
  return hints;
}

function hasRelevantTag(item: Item, contextTags: string[]): boolean {
  return item.tags.some((tag) => contextTags.includes(tag));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}
