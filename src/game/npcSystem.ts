import { initialNpcs } from "../data/npcs";
import type { GameState, NPC, ShopActionId } from "../types/game";

const clamp = (value: number, min = -100, max = 100) => Math.max(min, Math.min(max, value));

export function createInitialNpcs(): NPC[] {
  return structuredClone(initialNpcs);
}

export function normalizeNpcs(npcs?: NPC[]): NPC[] {
  const current = npcs ?? [];
  return initialNpcs.map((base) => ({ ...base, ...(current.find((npc) => npc.id === base.id) ?? {}) }));
}

export function adjustNpcRelationship(state: GameState, npcId: string, amount: number): GameState {
  return {
    ...state,
    npcs: normalizeNpcs(state.npcs).map((npc) => (npc.id === npcId ? { ...npc, relationship: clamp(npc.relationship + amount) } : npc)),
  };
}

export function getNpcRelationshipLabel(value: number): string {
  if (value <= -50) return "ไม่ไว้ใจ";
  if (value <= -10) return "ระวังตัว";
  if (value <= 20) return "เฉยชา";
  if (value <= 60) return "เป็นมิตร";
  return "ผูกพัน";
}

export function unlockNpc(state: GameState, npcId: string): GameState {
  return setNpcStatus(state, npcId, "available");
}

export function setNpcStatus(state: GameState, npcId: string, status: NPC["status"]): GameState {
  return {
    ...state,
    npcs: normalizeNpcs(state.npcs).map((npc) => (npc.id === npcId ? { ...npc, status } : npc)),
  };
}

export function getNpcByService(state: GameState, service: string): NPC | undefined {
  return normalizeNpcs(state.npcs).find((npc) => npc.status === "available" && (npc.services ?? []).includes(service));
}

export function getNpcServiceCostMultiplier(state: GameState, service: string): number {
  const npc = getNpcByService(state, service);
  if (!npc) return 1;
  if (npc.relationship >= 50) return 0.9;
  if (npc.relationship <= -30) return 1.1;
  return 1;
}

export function getInvestigationBadOutcomeModifier(state: GameState): number {
  const npc = getNpcByService(state, "investigateNextFloor");
  if (!npc) return 0;
  if (npc.relationship >= 50) return -5;
  if (npc.relationship <= -30) return 5;
  return 0;
}

export function getNpcServiceNarrative(state: GameState, actionId: ShopActionId | "investigate"): { npcId?: string; text?: string; relationshipChange?: number } {
  if (actionId === "inn-rest") {
    return {
      npcId: "innkeeper",
      relationshipChange: 1,
      text: "เจ้าของโรงเตี๊ยมวางชามซุปไว้ตรงหน้าโดยไม่พูดอะไรมาก เธอเพียงบอกว่า “พรุ่งนี้ค่อยกลัวต่อก็ได้”",
    };
  }
  if (actionId === "buy-bandage" || actionId === "buy-medicine") {
    return {
      npcId: "back-alley-doctor",
      relationshipChange: 1,
      text: "หมอไร้ใบอนุญาตไม่ถามว่าแผลมาจากอะไร เขาเพียงเย็บมันให้แน่นพอที่จะเดินต่อได้",
    };
  }
  if (actionId === "prepare-gear") {
    return {
      npcId: "silent-smith",
      relationshipChange: 1,
      text: "ช่างเงียบตรวจอุปกรณ์ด้วยมือที่นิ่งเกินมนุษย์ ก่อนวางของที่ซ่อมแล้วกลับมาโดยไม่ถามสักคำ",
    };
  }
  if (actionId === "investigate") {
    return {
      npcId: "rumor-broker",
      relationshipChange: 1,
      text: "คนขายข่าวยิ้มเหมือนรู้มากกว่าที่พูด และพูดน้อยกว่าที่ควรไว้ใจ",
    };
  }
  return {};
}

export function getDailyNpcLine(state: GameState): string {
  const npcs = normalizeNpcs(state.npcs).filter((npc) => npc.status === "available");
  const child = npcs.find((npc) => npc.id === "bell-child");
  if (child) return "วันนี้เด็กใต้ระฆังแตกนั่งอยู่ใกล้บ่อน้ำ เขามองผู้หลงทางเหมือนอยากขอบคุณ แต่ยังไม่รู้ว่าคำขอบคุณควรออกเสียงอย่างไร";
  if ((state.towerPressure ?? 0) >= 8) return "คนขายข่าวพูดเบาลงกว่าปกติ ราวกับกลัวว่าหอคอยจะได้ยินราคาของความจริง";
  if ((state.character?.survival.injury ?? 0) >= 50) return "หมอไร้ใบอนุญาตมองบาดแผลของผู้หลงทางนานกว่าที่ควร ก่อนหันไปเตรียมเข็มกับด้าย";
  return "วันนี้เจ้าของโรงเตี๊ยมมองผู้หลงทางเงียบๆ ราวกับรู้ว่าเขาฝืนยิ้มอยู่";
}

export function getNpcMemorialText(state: GameState): string | undefined {
  const closeNpc = normalizeNpcs(state.npcs)
    .filter((npc) => npc.status === "available" && npc.relationship >= 35)
    .sort((a, b) => b.relationship - a.relationship)[0];
  if (!closeNpc || !state.character) return undefined;
  if (closeNpc.id === "innkeeper") return `เจ้าของโรงเตี๊ยมวางถ้วยซุปไว้ที่โต๊ะเดิมหนึ่งคืนเต็ม แม้จะรู้ว่า${state.character.name}จะไม่กลับมากินมันอีกแล้ว`;
  if (closeNpc.id === "back-alley-doctor") return `หมอไร้ใบอนุญาตเก็บเข็มเย็บแผลลงกล่องช้าๆ เหมือนไม่อยากยอมรับว่าคราวนี้มือของเขาช่วยไม่ทัน`;
  if (closeNpc.id === "rumor-broker") return `คนขายข่าวไม่ตั้งราคากับเรื่องของ${state.character.name} เขาเพียงพับข่าวลือนั้นเก็บไว้ในเสื้อ`;
  if (closeNpc.id === "silent-smith") return `ช่างเงียบซ่อมอุปกรณ์ชิ้นหนึ่งจนเสร็จ แม้เจ้าของของมันจะไม่มีวันกลับมารับ`;
  if (closeNpc.id === "bell-child") return `เด็กใต้ระฆังแตกนั่งรอใกล้บ่อน้ำจนฟ้ามืด โดยไม่เข้าใจว่าทำไมคราวนี้ไม่มีใครเดินกลับมา`;
  return undefined;
}
