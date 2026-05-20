import { floors } from "../data/floors";
import { statLabels } from "./labels";
import { getInvestigationBadOutcomeModifier } from "./npcSystem";
import { getTowerPressureEffects } from "./towerPressure";
import type { ActionDelta, Character, FloorIntel, GameState, LastActionResult } from "../types/game";

type IntelOutcome = "trusted" | "partial" | "rumor" | "false" | "robbery" | "trade";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

interface InvestigationResult {
  state: GameState;
  lastActionResult: LastActionResult;
  journalTitle: string;
  journalText: string;
  outcome?: IntelOutcome;
}

export function investigateNextFloor(gameState: GameState): InvestigationResult {
  if (!gameState.character) {
    return {
      state: gameState,
      lastActionResult: { activityName: "สืบข่าวชั้นถัดไป", narrative: "ไม่มีผู้หลงทางให้ส่งไปสืบข่าว", deltas: [] },
      journalTitle: "สืบข่าวชั้นถัดไป",
      journalText: "ไม่มีใครออกไปถามข่าวในวันนี้",
    };
  }

  const before = structuredClone(gameState.character);
  const character = structuredClone(gameState.character);
  const nextFloorNumber = Math.min(10, character.maxFloorCleared + 1);
  const floor = floors.find((item) => item.floor === nextFloorNumber) ?? floors[0];
  const pressureEffects = getTowerPressureEffects(gameState.towerPressure ?? 0);
  const outcome = rollInvestigationOutcome(
    character,
    gameState.consecutiveActivity?.type === "investigate" ? gameState.consecutiveActivity.count + 1 : 1,
    pressureEffects.badIntelChanceBonus + getInvestigationBadOutcomeModifier(gameState),
  );
  const notes: string[] = [];
  let floorIntel: FloorIntel | undefined;
  let narrative = "";
  let journalText = "";

  character.survival.hunger = clamp(character.survival.hunger + 8);
  character.survival.fatigue = clamp(character.survival.fatigue + 10);

  if (outcome === "trusted") {
    const cost = Math.min(character.gold, randomRange(4, 8));
    character.gold -= cost;
    floorIntel = createIntel(floor, "trusted", 10, 5, floor.tags?.slice(0, 3) ?? [floor.challengeType], false);
    narrative = `${character.name} ได้พบคนที่เคยเฉียดผ่านชั้นนั้นมา เขาไม่ได้เล่าทุกอย่าง แต่คำเตือนของเขามีน้ำหนักพอให้เชื่อ`;
    journalText = "เขาใช้ทั้งวันไล่ตามข่าวลือเกี่ยวกับชั้นถัดไป และกลับมาพร้อมคำเตือนที่อาจช่วยชีวิตเขาได้";
    notes.push("ข้อมูลชั้นถัดไป: ได้รับ");
  } else if (outcome === "partial") {
    floorIntel = createIntel(floor, "partial", 5, 0, floor.tags?.slice(0, 2) ?? [floor.challengeType], false);
    narrative = "ข่าวที่ได้มาไม่ครบถ้วน แต่พอทำให้รู้ว่าชั้นถัดไปไม่ควรประมาท";
    journalText = "ข้อมูลบางอย่างมีราคาสูงกว่าทอง บางครั้งมันเรียกเอาความเชื่อใจของผู้หลงทางไปด้วย";
    notes.push("ข้อมูลชั้นถัดไป: ได้รับบางส่วน");
  } else if (outcome === "rumor") {
    if (Math.random() < 0.5) character.survival.hope = clamp(character.survival.hope + 1);
    else character.survival.morale = clamp(character.survival.morale + 1);
    floorIntel = createIntel(floor, "rumor", 0, 0, floor.tags?.slice(0, 1) ?? [], false);
    narrative = "ไม่มีใครยืนยันได้ว่าข่าวนี้จริงหรือไม่ แต่มันทำให้ผู้หลงทางอย่างน้อยรู้ว่าควรกลัวอะไร";
    journalText = "ข่าวลือนั้นฟังดูสมจริงเกินไป จนไม่มีใครรู้ว่ามันเป็นความจริง หรือกับดักที่หอคอยตั้งใจวางไว้";
    notes.push("ข้อมูลชั้นถัดไป: ข่าวลือ");
  } else if (outcome === "false") {
    floorIntel = createIntel(floor, "false", -5, 0, floor.tags?.slice(0, 2) ?? [floor.challengeType], true);
    narrative = `ข้อมูลที่ได้มาฟังดูมีเหตุผลเกินกว่าจะมองข้าม ${character.name} จดจำมันไว้ แม้บางอย่างในน้ำเสียงของผู้ให้ข่าวจะทำให้เขาไม่สบายใจ`;
    journalText = "ข่าวลือนั้นฟังดูสมจริงเกินไป จนไม่มีใครรู้ว่ามันเป็นความจริง หรือกับดักที่หอคอยตั้งใจวางไว้";
    notes.push("ข้อมูลชั้นถัดไป: ได้รับ");
  } else if (outcome === "robbery") {
    const goldLoss = Math.min(character.gold, randomRange(10, 25));
    const foodLoss = character.food > 0 && Math.random() < 0.55 ? 1 : 0;
    character.gold -= goldLoss;
    character.food -= foodLoss;
    character.survival.injury = clamp(character.survival.injury + randomRange(5, 15));
    character.survival.morale = clamp(character.survival.morale - 3);
    narrative = `ตรอกหลังตลาดไม่มีผู้ให้ข้อมูล มีเพียงเงาของคนที่รอเหยื่อเดินเข้าไปเอง ${character.name} กลับมาพร้อมทองที่หายไปและบาดแผลที่ต้องซ่อน`;
    journalText = "เขาออกไปตามหาคำตอบ แต่ตรอกหลังตลาดตอบกลับด้วยคมมีดและมือที่ล้วงถุงเงิน";
  } else {
    if (character.gold >= 12) {
      character.gold -= 12;
      floorIntel = createIntel(floor, "partial", 5, 0, floor.tags?.slice(0, 2) ?? [floor.challengeType], false);
      notes.push("ข้อมูลชั้นถัดไป: ได้รับบางส่วน");
    } else if (character.food > 0) {
      character.food -= 1;
      floorIntel = createIntel(floor, "rumor", 0, 0, floor.tags?.slice(0, 1) ?? [], false);
      notes.push("ข้อมูลชั้นถัดไป: ข่าวลือ");
    } else {
      character.survival.morale = clamp(character.survival.morale - 4);
    }
    narrative = "คนให้ข่าวไม่ต้องการคำขอบคุณ เขาต้องการบางสิ่งแลกเปลี่ยน และผู้หลงทางไม่มีทางเลือกมากนัก";
    journalText = "ข้อมูลบางอย่างมีราคาสูงกว่าทอง บางครั้งมันเรียกเอาความเชื่อใจของผู้หลงทางไปด้วย";
  }

  const state: GameState = {
    ...gameState,
    character,
    floorIntel,
    consecutiveActivity: {
      type: "investigate",
      count: gameState.consecutiveActivity?.type === "investigate" ? gameState.consecutiveActivity.count + 1 : 1,
    },
  };

  return {
    state,
    lastActionResult: {
      activityName: "สืบข่าวชั้นถัดไป",
      narrative,
      deltas: collectDeltas(before, character),
      notes,
      day: gameState.day,
    },
    journalTitle: "สืบข่าวชั้นถัดไป",
    journalText,
    outcome,
  };
}

function rollInvestigationOutcome(character: Character, consecutiveCount: number, pressureBadOutcomeBonus = 0): IntelOutcome {
  let reliable = 20;
  let partial = 25;
  let rumor = 20;
  let falseIntel = 15;
  let robbery = 10;
  let trade = 10;
  falseIntel += Math.floor(pressureBadOutcomeBonus * 0.45);
  robbery += Math.floor(pressureBadOutcomeBonus * 0.3);
  trade += Math.floor(pressureBadOutcomeBonus * 0.25);

  if (character.stats.focus >= 12) falseIntel -= 4;
  if (character.stats.instinct >= 12) robbery -= 4;
  if (character.classId === "scout") {
    reliable += 5;
    partial += 5;
  }
  if (character.classId === "rogue") {
    robbery -= 5;
    trade -= 3;
  }
  if (character.classId === "scholar") falseIntel -= 5;
  if (character.advancedClassId === "tower-decoder") {
    reliable += 5;
    partial += 3;
    falseIntel -= 5;
  }
  if (character.advancedClassId === "warped-truth-scribe") falseIntel -= 6;
  if (character.traits.some((trait) => trait.id === "skeptical")) falseIntel -= 5;
  if (character.traits.some((trait) => trait.id === "resourceful")) {
    robbery -= 3;
    trade -= 3;
  }
  if (character.survival.fatigue >= 70) {
    robbery += 8;
    falseIntel += 6;
  }
  if (character.survival.hunger >= 70) trade += 8;
  if (character.survival.sickness >= 50) reliable -= 5;
  if (character.survival.morale <= 30) falseIntel += 8;
  if (consecutiveCount === 2) {
    robbery += 5;
    trade += 5;
    falseIntel += 5;
  }
  if (consecutiveCount >= 3) {
    reliable -= 10;
    robbery += 8;
    trade += 6;
    falseIntel += 6;
  }

  const weights: Array<[IntelOutcome, number]> = [
    ["trusted", Math.max(5, reliable)],
    ["partial", Math.max(5, partial)],
    ["rumor", Math.max(5, rumor)],
    ["false", Math.max(3, falseIntel)],
    ["robbery", Math.max(2, robbery)],
    ["trade", Math.max(2, trade)],
  ];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [outcome, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return outcome;
  }
  return "rumor";
}

function createIntel(
  floor: { floor: number; title: string; tags?: string[]; challengeType: string },
  reliability: FloorIntel["reliability"],
  successBonus: number,
  injuryRiskReduction: number,
  tags: string[],
  isFalse: boolean,
): FloorIntel {
  return {
    id: crypto.randomUUID(),
    floorNumber: floor.floor,
    titleTh: floor.title,
    descriptionTh: buildIntelDescription(reliability, tags),
    reliability,
    successBonus,
    injuryRiskReduction,
    revealedTags: tags,
    isFalse,
    expiresAfterNextTower: true,
  };
}

function buildIntelDescription(reliability: FloorIntel["reliability"], tags: string[]) {
  if (reliability === "trusted") return `คำเตือนชี้ไปที่ ${tags.join(", ")} อย่างมีน้ำหนัก`;
  if (reliability === "partial") return `ข่าวที่ได้กล่าวถึง ${tags.join(", ")} แต่ยังขาดรายละเอียดสำคัญ`;
  if (reliability === "false") return "ข้อมูลนี้ฟังดูมีเหตุผลเกินกว่าจะมองข้าม";
  return "ข่าวลือคลุมเครือพอให้ระวัง แต่ไม่พอให้เชื่อสนิทใจ";
}

function collectDeltas(before: Character, after: Character): ActionDelta[] {
  const deltas: ActionDelta[] = [];
  const push = (key: string, label: string, oldValue: number, newValue: number, valueType: ActionDelta["valueType"]) => {
    if (oldValue === newValue) return;
    deltas.push({ key, label, before: oldValue, after: newValue, delta: newValue - oldValue, valueType });
  };
  push("hunger", "ความหิว", before.survival.hunger, after.survival.hunger, "bad");
  push("fatigue", "ความเหนื่อยล้า", before.survival.fatigue, after.survival.fatigue, "bad");
  push("injury", "อาการบาดเจ็บ", before.survival.injury, after.survival.injury, "bad");
  push("morale", "ขวัญกำลังใจ", before.survival.morale, after.survival.morale, "good");
  push("hope", "ความหวัง", before.survival.hope, after.survival.hope, "good");
  push("food", "อาหาร", before.food, after.food, "resource");
  push("gold", "ทอง", before.gold, after.gold, "resource");
  (Object.keys(before.stats) as Array<keyof Character["stats"]>).forEach((stat) => push(stat, statLabels[stat], before.stats[stat], after.stats[stat], "stat"));
  return deltas;
}
