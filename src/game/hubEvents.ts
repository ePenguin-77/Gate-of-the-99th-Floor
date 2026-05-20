import { hubEvents } from "../data/hubEvents";
import { adjustNpcRelationship } from "./npcSystem";
import type { ActionDelta, GameState, HubEventDefinition, HubEventPrompt, LastActionResult } from "../types/game";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const chance = (percent: number) => Math.random() * 100 < percent;

function isEligible(state: GameState, event: HubEventDefinition): boolean {
  if (!state.character) return false;
  if ((state.hubEventsSeen ?? []).includes(event.id)) return false;
  if (event.trigger === "wounded") return state.character.survival.injury >= 50 || state.character.survival.sickness >= 50;
  if (event.trigger === "childUnlocked") return state.npcs.some((npc) => npc.id === "bell-child" && npc.status === "available");
  if (event.trigger === "floorFive") return state.character.maxFloorCleared >= 5;
  if (event.trigger === "pressureHigh") return (state.towerPressure ?? 0) >= 8;
  return true;
}

export function maybeCreateHubEvent(state: GameState): HubEventPrompt | undefined {
  const pressure = state.towerPressure ?? 0;
  const eventChance = pressure >= 13 ? 40 : pressure >= 8 ? 30 : pressure >= 4 ? 20 : 15;
  if (!chance(eventChance)) return undefined;
  const eligible = hubEvents.filter((event) => isEligible(state, event));
  const event = eligible[Math.floor(Math.random() * eligible.length)];
  if (!event) return undefined;
  return {
    eventId: event.id,
    titleTh: event.titleTh,
    descriptionTh: event.descriptionTh,
    npcId: event.npcId,
    choices: event.choices,
  };
}

export function applyHubEventChoice(state: GameState, prompt: HubEventPrompt, choiceId: string): { state: GameState; result: LastActionResult; journalText: string } {
  if (!state.character) {
    return { state, result: { activityName: prompt.titleTh, narrative: "ไม่มีผู้หลงทางให้เหตุการณ์นี้เปลี่ยนแปลง", deltas: [] }, journalText: prompt.descriptionTh };
  }
  const before = structuredClone(state.character);
  const character = structuredClone(state.character);
  let nextState: GameState = { ...state, character, hubEventsSeen: [...(state.hubEventsSeen ?? []), prompt.eventId] };
  let narrative = "";

  const adjustNpc = (amount: number) => {
    if (prompt.npcId) nextState = adjustNpcRelationship(nextState, prompt.npcId, amount);
  };

  if (prompt.eventId === "rumor-broker-offer") {
    if (choiceId === "pay" && character.gold >= 4) {
      character.gold -= 4;
      nextState.floorIntel = { id: crypto.randomUUID(), floorNumber: Math.min(20, character.maxFloorCleared + 1), titleTh: "ข่าวจากคนขายข่าว", descriptionTh: "ข่าวนี้อาจช่วยให้เห็นอันตรายก่อนก้าวพลาด", reliability: "partial", successBonus: 5, injuryRiskReduction: 3, revealedTags: [], isFalse: false, expiresAfterNextTower: true };
      adjustNpc(2);
      narrative = "คนขายข่าวรับทองไปแล้วบอกเพียงประโยคสั้นๆ แต่มันหนักพอให้จำ";
    } else if (choiceId === "omen") {
      character.survival.morale = clamp(character.survival.morale - 1);
      adjustNpc(-1);
      narrative = "ลางบอกเหตุทำให้คำพูดของคนขายข่าวมีเงาแปลกๆ ผู้หลงทางเลือกจำเฉพาะส่วนที่ยังไม่เหม็นกลิ่นกับดัก";
    } else {
      adjustNpc(-1);
      narrative = "คนขายข่าวยิ้มบางๆ เมื่อถูกปฏิเสธ รอยยิ้มนั้นดูเหมือนราคาที่จะถูกคิดทีหลัง";
    }
  }

  if (prompt.eventId === "doctor-before-too-late") {
    if (choiceId === "pay" && character.gold >= 8) {
      character.gold -= 8;
      character.survival.injury = clamp(character.survival.injury - 12);
      character.survival.sickness = clamp(character.survival.sickness - 10);
      adjustNpc(2);
      narrative = "หมอไร้ใบอนุญาตรักษาโดยไม่ปลอบใจ แต่ร่างกายของผู้หลงทางเบาลงจริง";
    } else if (choiceId === "haggle") {
      character.gold = Math.max(0, character.gold - 4);
      character.survival.injury = clamp(character.survival.injury - 6);
      adjustNpc(-1);
      narrative = "การต่อรองทำให้ค่ารักษาถูกลง แต่สายตาของหมอเย็นลงไปอีกชั้น";
    } else {
      character.survival.morale = clamp(character.survival.morale - 2);
      adjustNpc(-2);
      narrative = "ผู้หลงทางเดินออกจากตรอกโดยยังเจ็บอยู่ และรู้ดีว่าบางโอกาสไม่ได้รอให้กลับมาคิดใหม่";
    }
  }

  if (prompt.eventId === "bell-child-food") {
    if (choiceId === "accept") {
      character.food += 1;
      character.survival.hope = clamp(character.survival.hope + 2);
      adjustNpc(2);
      narrative = "ขนมปังชิ้นเล็กไม่ได้ทำให้อิ่มมากนัก แต่มันทำให้เมืองพักพิงดูเย็นชาน้อยลง";
    } else if (choiceId === "give-gold" && character.gold > 0) {
      character.gold -= 1;
      character.survival.hope = clamp(character.survival.hope + 3);
      adjustNpc(4);
      narrative = "เด็กใต้ระฆังแตกกำทองไว้แน่นเหมือนมันเป็นคำสัญญาว่าตนยังมีที่อยู่ในเมืองนี้";
    } else {
      character.survival.hope = clamp(character.survival.hope + 1);
      adjustNpc(3);
      narrative = "เขาปฏิเสธอาหารอย่างอ่อนโยน เด็กคนนั้นจึงเก็บมันไว้ แต่ยิ้มได้เป็นครั้งแรก";
    }
  }

  if (prompt.eventId === "silent-smith-crack") {
    if (choiceId === "repair" && character.gold >= 6) {
      character.gold -= 6;
      nextState.preparationBuff = { successBonus: 4, injuryRiskReduction: 8, expiresAfterNextTower: true };
      adjustNpc(2);
      narrative = "ช่างเงียบซ่อมรอยร้าวโดยไม่พูดสักคำ แต่เสียงโลหะที่นิ่งลงทำให้ผู้หลงทางหายใจง่ายขึ้น";
    } else if (choiceId === "modify") {
      character.survival.fatigue = clamp(character.survival.fatigue + 5);
      nextState.preparationBuff = { successBonus: 2, injuryRiskReduction: 10, expiresAfterNextTower: true };
      adjustNpc(1);
      narrative = "อุปกรณ์ถูกดัดแปลงหยาบๆ มันไม่สวย แต่ในหอคอย ความสวยไม่เคยช่วยใครรอด";
    } else {
      adjustNpc(-1);
      narrative = "รอยร้าวยังอยู่ ช่างเงียบไม่ได้ห้าม เพียงมองมันเหมือนมองคำทำนาย";
    }
  }

  if (prompt.eventId === "town-talks") {
    if (choiceId === "let-rumor") {
      character.survival.morale = clamp(character.survival.morale + 3);
      nextState.towerPressure = Math.min(20, (nextState.towerPressure ?? 0) + 1);
      narrative = "ชื่อของผู้หลงทางกลายเป็นประกายเล็กๆ ในตลาด แต่หอคอยดูเหมือนจะได้ยินประกายนั้นด้วย";
    } else {
      character.survival.morale = clamp(character.survival.morale - 1);
      nextState.towerPressure = Math.max(0, (nextState.towerPressure ?? 0) - 1);
      narrative = "เขาหลบหน้าผู้คน เมืองเงียบลง และหอคอยเหมือนมองหาเขายากขึ้นเล็กน้อย";
    }
  }

  if (prompt.eventId === "tower-shadow-market") {
    if (choiceId === "follow") {
      character.survival.morale = clamp(character.survival.morale - 3);
      character.survival.hope = clamp(character.survival.hope + 1);
      nextState.towerPressure = Math.max(0, (nextState.towerPressure ?? 0) - 1);
      narrative = "เขาตามเงานั้นไปจนถึงตรอกตัน และกลับมาพร้อมความกลัวที่มีรูปร่างชัดขึ้น";
    } else if (choiceId === "hide-inn") {
      character.survival.morale = clamp(character.survival.morale + 2);
      nextState = adjustNpcRelationship(nextState, "innkeeper", 2);
      narrative = "เจ้าของโรงเตี๊ยมปิดประตูให้ก่อนเงานั้นจะผ่านไป เธอไม่ถามอะไรเลย";
    } else {
      character.divine.dependency = clamp(character.divine.dependency + 1);
      character.survival.morale = clamp(character.survival.morale + 1);
      narrative = "เสียงกระซิบเตือนทันเวลา ผู้หลงทางก้มหน้าลงก่อนเงานั้นจะหันมา";
    }
  }

  nextState.character = character;
  return {
    state: nextState,
    result: {
      activityName: prompt.titleTh,
      narrative,
      deltas: collectSimpleDeltas(before, character),
      day: nextState.day,
    },
    journalText: narrative,
  };
}

function collectSimpleDeltas(before: GameState["character"], after: GameState["character"]): ActionDelta[] {
  if (!before || !after) return [];
  const deltas: Array<[string, string, number, number, ActionDelta["valueType"]]> = [
    ["gold", "ทอง", before.gold, after.gold, "resource" as const],
    ["food", "อาหาร", before.food, after.food, "resource" as const],
    ["morale", "ขวัญกำลังใจ", before.survival.morale, after.survival.morale, "good" as const],
    ["hope", "ความหวัง", before.survival.hope, after.survival.hope, "good" as const],
    ["injury", "อาการบาดเจ็บ", before.survival.injury, after.survival.injury, "bad" as const],
    ["sickness", "อาการป่วย", before.survival.sickness, after.survival.sickness, "bad" as const],
  ];
  return deltas
    .filter(([, , oldValue, newValue]) => oldValue !== newValue)
    .map(([key, label, oldValue, newValue, valueType]) => ({
      key: key as string,
      label: label as string,
      before: oldValue as number,
      after: newValue as number,
      delta: (newValue as number) - (oldValue as number),
      valueType,
    }));
}
