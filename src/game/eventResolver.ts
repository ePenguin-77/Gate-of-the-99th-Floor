import { difficultySettings } from "./difficulty";
import { divineActions } from "./divineActions";
import { divineLabels, statLabels, survivalLabels } from "./labels";
import { getAct2FloorHooks } from "./act2Hooks";
import { calculateMemoryModifiers, createMemoryFromEvent, getFloorMemoryTags } from "./memorySystem";
import { getTowerPressureEffects } from "./towerPressure";
import { calculateTraitEvolutionModifier, updateTraitProgress } from "./traitEvolution";
import { getAdvancedClass, getAdvancedClassChanceBonus, getAdvancedClassReason } from "./advancedClassSystem";
import { applyPathChanges, formatPathChanges, getTowerPathChanges } from "./pathAffinity";
import {
  applyClassActionCost,
  applyClassFailurePassives,
  applyClassSuccessPassives,
  getClassActionReason,
  getClassPassiveChanceBonus,
  getClassPassiveReason,
  unlockClassSkills,
} from "./classIdentity";
import { getItemEffectsForCharacter } from "./inventorySystem";
import type {
  Character,
  DifficultyMode,
  DivineActionId,
  EncounterResolutionOptions,
  FloorIntel,
  FloorDefinition,
  FloorResult,
  FloorResultLevel,
  NPC,
  PreparationBuff,
  StatKey,
  SurvivalKey,
} from "../types/game";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const chance = (percent: number) => Math.random() * 100 < percent;

function getTowerAttemptSurvivalCost(floorNumber: number, revisit: boolean): { hunger: number; fatigue: number } {
  if (floorNumber <= 3) return revisit ? { hunger: 7, fatigue: 12 } : { hunger: 10, fatigue: 16 };
  if (floorNumber <= 10) return revisit ? { hunger: 10, fatigue: 16 } : { hunger: 14, fatigue: 22 };
  return revisit ? { hunger: 12, fatigue: 18 + floorNumber } : { hunger: 16, fatigue: 24 + floorNumber };
}

interface EstimateDetail {
  label: string;
  value: number;
}

interface TowerEstimate {
  chance: number;
  rawChance: number;
  baseChance: number;
  preparedness: number;
  difficulty: number;
  relevantStatScore: number;
  divineBonus: number;
  intelBonus: number;
  preparationBonus: number;
  towerPressurePenalty: number;
  riskLabel: string;
  advice: string;
  reasons: string[];
  penalties: EstimateDetail[];
}

function traitBonus(character: Character, floor: FloorDefinition): number {
  const tags = floor.tags ?? [];
  return character.traits.reduce((total, trait) => {
    let bonus = 0;
    if (trait.tags.includes(floor.challengeType) || trait.tags.some((tag) => tags.includes(tag))) bonus += trait.kind === "negative" ? -5 : 5;
    if (tags.includes("darkness") && trait.tags.includes("dark")) bonus -= 7;
    if (trait.id === "skeptical" && (floor.challengeType === "puzzle" || floor.challengeType === "trap")) bonus += 3;
    if (trait.id === "strong-faith") bonus += Math.floor(character.divine.faith / 15);
    if (trait.id === "hot-headed" && (floor.challengeType === "combat" || floor.challengeType === "boss")) bonus += 3;
    if (trait.id === "hot-headed" && floor.challengeType === "moral") bonus -= 5;
    return total + bonus;
  }, 0);
}

function classBonus(character: Character, floor: FloorDefinition, revisit: boolean): number {
  const classId = character.classId;
  let bonus = 0;
  if (classId === "fighter" && (floor.challengeType === "combat" || floor.challengeType === "boss")) bonus += 5;
  if (classId === "guard" && (floor.challengeType === "survival" || floor.challengeType === "trap")) bonus += 4;
  if (classId === "scout" && (revisit || floor.challengeType === "trap" || floor.challengeType === "darkness")) bonus += 5;
  if (classId === "hunter" && floor.challengeType === "survival") bonus += 4;
  if (classId === "acolyte" && floor.challengeType === "moral") bonus += 4;
  if (classId === "scholar" && floor.challengeType === "puzzle") bonus += 5;
  if (classId === "rogue" && (floor.challengeType === "npc" || floor.challengeType === "trap")) bonus += 4;
  return bonus;
}

function relationshipBonus(character: Character, actionId: DivineActionId): number {
  if (actionId === "silence") return Math.floor(character.divine.independence / 12);
  if (actionId === "blessing") return Math.floor(character.divine.faith / 14);
  if (actionId === "whisper") return Math.floor((character.divine.faith + character.divine.dependency) / 20);
  if (actionId === "omen") return Math.floor((character.divine.faith + character.stats.instinct) / 18);
  return 0;
}

function divineActionBonus(actionId: DivineActionId, floor: FloorDefinition, contextTags: string[], character: Character): number {
  const critical = Math.max(character.survival.hunger, character.survival.fatigue, character.survival.injury, character.survival.sickness) >= 80;
  if (actionId === "whisper") {
    return floor.challengeType === "puzzle" || floor.challengeType === "moral" || floor.challengeType === "npc" ? 12 : 8;
  }
  if (actionId === "omen") {
    return floor.challengeType === "survival" || floor.challengeType === "trap" || contextTags.includes("darkness") || contextTags.includes("danger") ? 14 : 6;
  }
  if (actionId === "blessing") return critical ? 20 : 16;
  return 0;
}

function getAct2PressurePenalty(basePenalty: number, floor: FloorDefinition): number {
  if (floor.floor < 11) return basePenalty;
  const multiplier = floor.floor >= 20 ? 1.75 : floor.floor >= 16 ? 1.5 : 1.25;
  return Math.round(basePenalty * multiplier);
}

function getAdvancedClassFloorSynergy(character: Character, floor: FloorDefinition, actionId: DivineActionId): { bonus: number; drawback: number; reasons: string[] } {
  if (floor.floor < 11) return { bonus: 0, drawback: 0, reasons: [] };
  const advancedClass = getAdvancedClass(character);
  if (!advancedClass) return { bonus: 0, drawback: 0, reasons: ["ผู้หลงทางยังไม่ได้ยอมรับชะตาใหม่ เมืองร้างจึงกดเขาหนักกว่าที่ควร"] };
  const tags = floor.tags ?? [];
  let matches = 0;
  const effects = advancedClass.effects;
  const hasAny = (items: string[]) => items.some((tag) => tags.includes(tag));
  if ((effects.blessingBonus ?? 0) > 0 && (actionId === "blessing" || hasAny(["faith", "boss", "hope", "morale"]))) matches += 2;
  if ((effects.silenceBonus ?? 0) > 0 && (actionId === "silence" || hasAny(["identity", "independent", "shadow"]))) matches += 2;
  if ((effects.puzzleBonus ?? 0) > 0 && (floor.challengeType === "puzzle" || hasAny(["puzzle", "mechanism", "false_rule", "intel", "book"]))) matches += 2;
  if ((effects.trapBonus ?? 0) > 0 && (floor.challengeType === "trap" || hasAny(["trap", "stealth", "danger", "fire"]))) matches += 2;
  if ((effects.darknessBonus ?? 0) > 0 && hasAny(["darkness", "fear"])) matches += 2;
  if ((effects.survivalBonus ?? 0) > 0 && (floor.challengeType === "survival" || hasAny(["survival", "resource", "hunger", "fatigue", "time"]))) matches += 2;
  if ((effects.combatBonus ?? 0) > 0 && (floor.challengeType === "combat" || floor.challengeType === "boss" || hasAny(["combat", "boss"]))) matches += 2;
  if ((effects.npcBonus ?? 0) > 0 && (floor.challengeType === "npc" || hasAny(["npc", "promise", "merciful", "protector", "guilt"]))) matches += 2;
  if ((effects.pressureBonus ?? 0) > 0 && hasAny(["pressure", "death_echo", "act2_finale"])) matches += 1;
  if (floor.floor === 20 && matches > 0) matches += 1;

  let drawback = 0;
  const reasons: string[] = [];
  if (matches > 0) {
    const bonus = floor.floor === 20 ? 12 : Math.min(14, 8 + matches * 2);
    reasons.push(`คลาสขั้นสอง “${advancedClass.nameTh}” สอดคล้องกับบททดสอบของชั้นนี้`);
    return { bonus, drawback: getAdvancedClassDrawbackPenalty(character, floor, actionId, reasons), reasons };
  }
  if ((effects.blessingBonus ?? 0) < 0 && actionId === "blessing") drawback -= 3;
  if ((effects.npcBonus ?? 0) < 0 && (floor.challengeType === "npc" || tags.includes("npc"))) drawback -= 3;
  if (drawback < 0) reasons.push(`ข้อเสียของคลาสขั้นสอง “${advancedClass.nameTh}” ทำให้ชั้นนี้รับมือยากขึ้น`);
  return { bonus: 0, drawback, reasons };
}

function getAdvancedClassDrawbackPenalty(character: Character, floor: FloorDefinition, actionId: DivineActionId, reasons: string[]): number {
  const advancedClass = getAdvancedClass(character);
  if (!advancedClass) return 0;
  let drawback = 0;
  if ((advancedClass.effects.blessingBonus ?? 0) < 0 && actionId === "blessing") {
    drawback -= 3;
    reasons.push("พรแห่งเทพไม่เข้ากับเส้นทางขั้นสองของเขานัก");
  }
  if ((advancedClass.effects.npcBonus ?? 0) < 0 && (floor.challengeType === "npc" || (floor.tags ?? []).includes("npc"))) {
    drawback -= 3;
    reasons.push("ข้อเสียของคลาสขั้นสองทำให้เหตุการณ์ที่เกี่ยวกับผู้คนหนักขึ้น");
  }
  if ((advancedClass.effects.rewardModifier ?? 0) < 0 && (floor.tags ?? []).some((tag) => ["market", "gold", "tax"].includes(tag))) {
    drawback -= 2;
    reasons.push("นิสัยการช่วยคนก่อนเก็บของทำให้ชั้นที่เกี่ยวกับทรัพยากรเสียเปรียบเล็กน้อย");
  }
  return drawback;
}

function getAct2StatusPenaltyDetails(character: Character, floor: FloorDefinition): { total: number; details: EstimateDetail[]; reasons: string[] } {
  if (floor.floor < 11) return { total: 0, details: [], reasons: [] };
  const { hunger, fatigue, injury, sickness } = character.survival;
  const details: EstimateDetail[] = [];
  const reasons: string[] = [];
  let total = 0;
  const add = (label: string, value: number, reason: string) => {
    total += value;
    details.push({ label, value });
    reasons.push(reason);
  };

  if (floor.floor <= 3) {
    if (hunger >= 95) add("ความหิวขั้นวิกฤต", -18, "ความหิวแทบตัดการตัดสินใจของเขาออกจากร่างกาย");
    else if (hunger >= 80) add("ความหิวรุนแรง", -10, "ความหิวเริ่มกลืนสมาธิ");
    else if (hunger >= 60) add("ความหิวสูง", -5, "ความหิวทำให้เขาตัดสินใจช้าลง");
    else if (hunger >= 40) add("เริ่มหิว", -2, "ความหิวเริ่มรบกวนสมาธิ");

    if (fatigue >= 95) add("ความเหนื่อยล้าขั้นวิกฤต", -22, "ความเหนื่อยล้าอาจทำให้เขาทรุดลงกลางทาง");
    else if (fatigue >= 80) add("อ่อนล้าหนัก", -12, "ร่างกายตอบสนองช้าลงและเสี่ยงบาดเจ็บ");
    else if (fatigue >= 60) add("เหนื่อยล้าสูง", -6, "ความเหนื่อยล้าทำให้การตอบสนองช้าลง");
    else if (fatigue >= 40) add("เริ่มเหนื่อย", -2, "ความเหนื่อยล้าสะสมเริ่มกดร่างกาย");

    if (injury >= 90) add("บาดแผลวิกฤต", -28, "บาดแผลพร้อมเปิดซ้ำหากฝืนขึ้นหอคอย");
    else if (injury >= 70) add("บาดเจ็บหนัก", -20, "บาดแผลหนักทำให้ทุกการเคลื่อนไหวมีราคา");
    else if (injury >= 40) add("บาดเจ็บ", floor.challengeType === "combat" || floor.challengeType === "boss" ? -20 : -8, "บาดแผลลดโอกาสรอด โดยเฉพาะการปะทะ");
    else if (injury >= 20 && (floor.challengeType === "combat" || floor.challengeType === "boss")) add("บาดแผลรบกวนการต่อสู้", -5, "บาดแผลทำให้การปะทะเสียเปรียบ");

    if (sickness >= 90) add("ป่วยขั้นวิกฤต", -25, "ไข้และลมหายใจขาดห้วงทำให้หอคอยอันตรายขึ้นมาก");
    else if (sickness >= 70) add("ป่วยหนัก", -18, "อาการป่วยกัดกินทั้งแรงกายและความหวัง");
    else if (sickness >= 40) add("เริ่มป่วย", -8, "อาการป่วยทำให้เหนื่อยง่ายและเสียสมาธิ");

    if ((floor.tags ?? []).includes("trap")) reasons.push("ชั้นนี้มีความเสี่ยงจากกับดักและการซุ่มโจมตี");
    if ((floor.tags ?? []).includes("darkness")) reasons.push("ความมืดทำให้การประเมินอันตรายยากขึ้น");
    return { total, details, reasons };
  }
  if (hunger >= 95) add("บทลงโทษความหิวในเมืองร้าง", -5, "เมืองร้างลงโทษความหิวรุนแรงกว่าช่วงก่อนประตูแรก");
  else if (hunger >= 80) add("บทลงโทษความหิวในเมืองร้าง", -3, "ความหิวทำให้ภาพลวงในเมืองร้างน่าเชื่อขึ้น");
  else if (hunger >= 60) add("บทลงโทษความหิวในเมืองร้าง", -2, "ความหิวเริ่มทำให้ตัดสินใจพลาดในเมืองร้าง");
  else if (hunger >= 40) add("บทลงโทษความหิวในเมืองร้าง", -1, "แม้ความหิวระดับต้นก็มีผลในเมืองร้างเหนือประตูแรก");

  if (fatigue >= 95) add("บทลงโทษความเหนื่อยล้าในเมืองร้าง", -5, "ความเหนื่อยล้าขั้นวิกฤตอาจทำให้เขาทรุดกลางชั้น Act 2");
  else if (fatigue >= 80) add("บทลงโทษความเหนื่อยล้าในเมืองร้าง", -4, "เมืองร้างทำให้ความเหนื่อยล้ากลายเป็นความผิดพลาดเร็วขึ้น");
  else if (fatigue >= 60) add("บทลงโทษความเหนื่อยล้าในเมืองร้าง", -4, "ความเหนื่อยล้าทำให้การตอบสนองในเมืองร้างช้าลงมาก");
  else if (fatigue >= 40) add("บทลงโทษความเหนื่อยล้าในเมืองร้าง", -1, "ความเหนื่อยล้าระดับต้นเริ่มสร้างเสียงรบกวนในเมืองร้าง");

  if (injury >= 90) add("บทลงโทษบาดแผลในเมืองร้าง", -4, "บาดแผลระดับวิกฤตอาจกลายเป็นจุดจบหากฝืนเมืองร้าง");
  else if (injury >= 70) add("บทลงโทษบาดแผลในเมืองร้าง", -5, "บาดแผลหนักทำให้ชั้น Act 2 อันตรายขึ้นชัดเจน");
  else if (injury >= 40) add("บทลงโทษบาดแผลในเมืองร้าง", -4, "บาดแผลที่ยังไม่หายทำให้เมืองร้างอ่านจุดอ่อนของเขาได้");
  else if (injury >= 20) add("บทลงโทษบาดแผลในเมืองร้าง", -6, "แม้บาดแผลไม่ลึก เมืองร้างก็รู้วิธีบังคับให้มันเปิดซ้ำ");

  if (sickness >= 90) add("บทลงโทษอาการป่วยในเมืองร้าง", -5, "อาการป่วยระดับวิกฤตทำให้เมืองร้างเหมือนมีพิษในอากาศ");
  else if (sickness >= 70) add("บทลงโทษอาการป่วยในเมืองร้าง", -4, "อาการป่วยทำให้ความหวังและแรงใจถูกกัดกินเร็วขึ้น");
  else if (sickness >= 40) add("บทลงโทษอาการป่วยในเมืองร้าง", -2, "อาการป่วยทำให้การเดินในเมืองร้างสิ้นแรงเร็วกว่าปกติ");
  return { total, details, reasons };
}

function getAct2FloorSpecificModifier(character: Character, floor: FloorDefinition, floorIntel: FloorIntel | undefined, towerPressure: number): { successModifier: number; injuryRiskModifier: number; moraleFailurePenalty: number; hopeFailurePenalty: number; sicknessFailureBonus: number; reasons: string[] } {
  if (floor.floor < 11) return { successModifier: 0, injuryRiskModifier: 0, moraleFailurePenalty: 0, hopeFailurePenalty: 0, sicknessFailureBonus: 0, reasons: [] };
  const tags = floor.tags ?? [];
  const reasons: string[] = [];
  let successModifier = 0;
  let injuryRiskModifier = 0;
  let moraleFailurePenalty = 0;
  let hopeFailurePenalty = 0;
  let sicknessFailureBonus = 0;
  const hasEquipped = (itemId: string) => (character.equippedItems ?? []).includes(itemId);

  if (floor.floor === 11 && character.stats.instinct <= 9) {
    injuryRiskModifier += 8;
    reasons.push("สัญชาตญาณต่ำทำให้กับดักและคำสาปในตลาดร้างอันตรายขึ้น");
  }
  if (floor.floor === 12 && character.survival.fatigue >= 60) {
    successModifier -= 8;
    reasons.push("ความเหนื่อยล้าทำให้เสียงฝีเท้าดังเกินควบคุมในโรงเก็บเสียง");
  }
  if (floor.floor === 13 && character.survival.hope <= 50) {
    moraleFailurePenalty += 5;
    reasons.push("ความหวังต่ำทำให้จัตุรัสคนไร้เงากัดกินตัวตนได้ง่ายขึ้น");
  }
  if (floor.floor === 14 && floorIntel?.isFalse) {
    successModifier -= 6;
    reasons.push("ข้อมูลปลอมอันตรายเป็นพิเศษในห้องสมุดที่กินคำตอบ");
  }
  if (floor.floor === 15 && towerPressure >= 8) {
    successModifier -= 8;
    reasons.push("หอนาฬิกาตอบสนองต่อความกดดันของหอคอยอย่างรุนแรง");
  }
  if (floor.floor === 15 && character.survival.fatigue >= 70) {
    injuryRiskModifier += 10;
    reasons.push("ความเหนื่อยล้าสูงทำให้เสี่ยงทรุดกลางหอนาฬิกา");
  }
  if (floor.floor === 16 && character.memories.some((memory) => memory.tags.includes("guilt"))) {
    moraleFailurePenalty += 5;
    reasons.push("ความทรงจำแห่งความผิดทำให้ศาลาคำสัญญาเจ็บลึกขึ้น");
  }
  if (floor.floor === 17 && !hasEquipped("rough_bandage") && !hasEquipped("bitter_medicine")) {
    injuryRiskModifier += 10;
    reasons.push("ไม่มีอุปกรณ์รักษาที่เหมาะกับความเสี่ยงจากโรงตีเหล็ก");
  }
  if (floor.floor === 18 && character.survival.hope <= 45) {
    moraleFailurePenalty += 6;
    hopeFailurePenalty += 4;
    reasons.push("ความหวังต่ำทำให้ถนนที่ย้อนจำชื่อเกือบลบเหตุผลที่จะเดินต่อ");
  }
  if (floor.floor === 19 && character.gold <= 0) {
    moraleFailurePenalty += 4;
    injuryRiskModifier += 6;
    reasons.push("ไม่มีทองต่อรองกับด่านภาษีทำให้ทางเลือกแคบลง");
  } else if (floor.floor === 19 && character.gold >= 40) {
    successModifier -= 4;
    reasons.push("ทองที่มากเกินไปทำให้ด่านภาษีของผู้เฝ้าตั้งราคาแพงขึ้น");
  }
  if (floor.floor === 20) {
    successModifier -= 6;
    injuryRiskModifier += 8;
    moraleFailurePenalty += 5;
    reasons.push("นายทะเบียนแห่งชั้นถัดไปใช้คลาสขั้นสองและชะตาที่ก่อตัวเป็นแกนของบททดสอบ");
  }
  if (tags.includes("fire") && character.survival.injury >= 40) sicknessFailureBonus += 4;
  return { successModifier, injuryRiskModifier, moraleFailurePenalty, hopeFailurePenalty, sicknessFailureBonus, reasons };
}

function getAct2PreparednessModifier(
  floor: FloorDefinition,
  matchingIntel: FloorIntel | undefined,
  preparationBuff: PreparationBuff | undefined,
  itemEffects: { successBonus: number; injuryRiskReduction: number; criticalProtection: boolean; reasons: string[] },
  synergyBonus: number,
): { successModifier: number; injuryRiskModifier: number; moraleFailurePenalty: number; reasons: string[]; unprepared: boolean } {
  if (floor.floor < 11) return { successModifier: 0, injuryRiskModifier: 0, moraleFailurePenalty: 0, reasons: [], unprepared: false };
  const prepared = Boolean(matchingIntel) || Boolean(preparationBuff) || itemEffects.successBonus > 0 || itemEffects.injuryRiskReduction > 0 || itemEffects.criticalProtection || synergyBonus > 0;
  if (prepared) return { successModifier: 0, injuryRiskModifier: 0, moraleFailurePenalty: 0, reasons: ["มีการเตรียมตัวบางอย่างช่วยรับมือเมืองร้างเหนือประตูแรก"], unprepared: false };
  const successModifier = floor.floor >= 20 ? -15 : floor.floor >= 16 ? -12 : -8;
  const injuryRiskModifier = floor.floor >= 20 ? 15 : floor.floor >= 16 ? 12 : 8;
  return {
    successModifier,
    injuryRiskModifier,
    moraleFailurePenalty: floor.floor >= 20 ? 5 : 0,
    reasons: ["ผู้หลงทางแทบไม่มีสิ่งใดช่วยรับมือชั้นนี้ การฝืนขึ้นไปโดยไม่เตรียมตัวอาจมีราคาสูง"],
    unprepared: true,
  };
}

function getAct2FailureAdjustments(
  floor: FloorDefinition,
  critical: boolean,
  preparedness: { moraleFailurePenalty: number },
  floorSpecific: { moraleFailurePenalty: number; hopeFailurePenalty: number; sicknessFailureBonus: number },
): { fatigue: number; injury: number; morale: number; hope: number; sickness: number; effects: string[] } {
  if (floor.floor < 11) return { fatigue: 0, injury: 0, morale: 0, hope: 0, sickness: 0, effects: [] };
  const floor20 = floor.floor >= 20;
  const lateAct2 = floor.floor >= 16 && floor.floor < 20;
  const fatigue = critical ? (floor20 ? 20 : lateAct2 ? 14 : 8) : floor20 ? 8 : lateAct2 ? 5 : 3;
  const injury = critical ? (floor20 ? 24 : lateAct2 ? 14 : 7) : floor20 ? 8 : lateAct2 ? 5 : 2;
  const morale = (critical ? (floor20 ? 15 : lateAct2 ? 10 : 5) : floor20 ? 5 : lateAct2 ? 3 : 0) + preparedness.moraleFailurePenalty + floorSpecific.moraleFailurePenalty;
  const hope = (critical ? (floor20 ? 10 : lateAct2 ? 5 : 2) : floor20 ? 4 : 0) + floorSpecific.hopeFailurePenalty;
  const sickness = (critical ? (floor20 ? 10 : lateAct2 ? 6 : 3) : 0) + floorSpecific.sicknessFailureBonus;
  return {
    fatigue,
    injury,
    morale,
    hope,
    sickness,
    effects: ["เมืองร้างเหนือประตูแรกลงโทษความผิดพลาดรุนแรงกว่าชั้นก่อนหน้า"],
  };
}

function statusPenaltyDetails(character: Character, floor: FloorDefinition): { total: number; details: EstimateDetail[]; reasons: string[] } {
  const details: EstimateDetail[] = [];
  const reasons: string[] = [];
  const { hunger, fatigue, injury, sickness } = character.survival;
  let total = 0;
  const add = (label: string, value: number, reason: string) => {
    total += value;
    details.push({ label, value });
    reasons.push(reason);
  };

  if (floor.floor <= 3) {
    if (hunger >= 95) add("ความหิวขั้นวิกฤต", -18, "ความหิวแทบตัดการตัดสินใจของเขาออกจากร่างกาย");
    else if (hunger >= 80) add("ความหิวรุนแรง", -10, "ความหิวเริ่มกลืนสมาธิ");
    else if (hunger >= 60) add("ความหิวสูง", -5, "ความหิวทำให้เขาตัดสินใจช้าลง");
    else if (hunger >= 40) add("เริ่มหิว", -2, "ความหิวเริ่มรบกวนสมาธิ");

    if (fatigue >= 95) add("ความเหนื่อยล้าขั้นวิกฤต", -22, "ความเหนื่อยล้าอาจทำให้เขาทรุดลงกลางทาง");
    else if (fatigue >= 80) add("อ่อนล้าหนัก", -12, "ร่างกายตอบสนองช้าลงและเสี่ยงบาดเจ็บ");
    else if (fatigue >= 60) add("เหนื่อยล้าสูง", -6, "ความเหนื่อยล้าทำให้การตอบสนองช้าลง");
    else if (fatigue >= 40) add("เริ่มเหนื่อย", -2, "ความเหนื่อยล้าสะสมเริ่มกดร่างกาย");

    if (injury >= 90) add("บาดแผลวิกฤต", -28, "บาดแผลพร้อมเปิดซ้ำหากฝืนขึ้นหอคอย");
    else if (injury >= 70) add("บาดเจ็บหนัก", -20, "บาดแผลหนักทำให้ทุกการเคลื่อนไหวมีราคา");
    else if (injury >= 40) add("บาดเจ็บ", floor.challengeType === "combat" || floor.challengeType === "boss" ? -20 : -8, "บาดแผลลดโอกาสรอด โดยเฉพาะการปะทะ");
    else if (injury >= 20 && (floor.challengeType === "combat" || floor.challengeType === "boss")) add("บาดแผลรบกวนการต่อสู้", -5, "บาดแผลทำให้การปะทะเสียเปรียบ");

    if (sickness >= 90) add("ป่วยขั้นวิกฤต", -25, "ไข้และลมหายใจขาดห้วงทำให้หอคอยอันตรายขึ้นมาก");
    else if (sickness >= 70) add("ป่วยหนัก", -18, "อาการป่วยกัดกินทั้งแรงกายและความหวัง");
    else if (sickness >= 40) add("เริ่มป่วย", -8, "อาการป่วยทำให้เหนื่อยง่ายและเสียสมาธิ");

    if ((floor.tags ?? []).includes("trap")) reasons.push("ชั้นนี้มีความเสี่ยงจากกับดักและการซุ่มโจมตี");
    if ((floor.tags ?? []).includes("darkness")) reasons.push("ความมืดทำให้การประเมินอันตรายยากขึ้น");
    return { total, details, reasons };
  }

  if (hunger >= 95) add("ความหิวขั้นวิกฤต", -25, "ความหิวแทบตัดการตัดสินใจของเขาออกจากร่างกาย");
  else if (hunger >= 80) add("ความหิวรุนแรง", -15, "ความหิวเริ่มกลืนสมาธิและเพิ่มโอกาสล้มป่วย");
  else if (hunger >= 60) add("ความหิวสูง", -8, "ความหิวทำให้เขาตัดสินใจช้าลง");
  else if (hunger >= 40) add("เริ่มหิว", -3, "ความหิวเริ่มรบกวนสมาธิ");

  if (fatigue >= 95) add("ความเหนื่อยล้าขั้นวิกฤต", -30, "ความเหนื่อยล้าอาจทำให้เขาทรุดลงกลางทาง");
  else if (fatigue >= 80) add("อ่อนล้าหนัก", -18, "ร่างกายตอบสนองช้าลงและเสี่ยงบาดเจ็บ");
  else if (fatigue >= 60) add("เหนื่อยล้าสูง", -8, "ความเหนื่อยล้าทำให้การตอบสนองช้าลง");
  else if (fatigue >= 40) add("เริ่มเหนื่อย", -3, "ความเหนื่อยล้าสะสมเริ่มกดร่างกาย");

  if (injury >= 90) add("บาดแผลวิกฤต", -28, "บาดแผลพร้อมเปิดซ้ำหากฝืนขึ้นหอคอย");
  else if (injury >= 70) add("บาดเจ็บหนัก", -20, "บาดแผลหนักทำให้ทุกการเคลื่อนไหวมีราคา");
  else if (injury >= 40) add("บาดเจ็บ", floor.challengeType === "combat" || floor.challengeType === "boss" ? -23 : -8, "บาดแผลลดโอกาสรอด โดยเฉพาะการปะทะ");
  else if (injury >= 20 && (floor.challengeType === "combat" || floor.challengeType === "boss")) add("บาดแผลรบกวนการต่อสู้", -5, "บาดแผลทำให้การปะทะเสียเปรียบ");

  if (sickness >= 90) add("ป่วยขั้นวิกฤต", -25, "ไข้และลมหายใจขาดห้วงทำให้หอคอยอันตรายขึ้นมาก");
  else if (sickness >= 70) add("ป่วยหนัก", -18, "อาการป่วยกัดกินทั้งแรงกายและความหวัง");
  else if (sickness >= 40) add("เริ่มป่วย", -8, "อาการป่วยทำให้เหนื่อยง่ายและเสียสมาธิ");

  if ((floor.tags ?? []).includes("trap")) reasons.push("ชั้นนี้มีความเสี่ยงจากกับดักและการซุ่มโจมตี");
  if ((floor.tags ?? []).includes("darkness")) reasons.push("ความมืดทำให้การประเมินอันตรายยากขึ้น");
  if (floor.challengeType === "boss") reasons.push("ผู้เฝ้าประตูเป็นกำแพงแรกที่หอคอยตั้งใจให้ยากจริง");

  return { total, details, reasons };
}

function floorClamp(floorNumber: number): { min: number; max: number } {
  if (floorNumber >= 20) return { min: 8, max: 48 };
  if (floorNumber >= 16) return { min: 10, max: 55 };
  if (floorNumber >= 13) return { min: 12, max: 60 };
  if (floorNumber >= 11) return { min: 15, max: 70 };
  if (floorNumber >= 10) return { min: 10, max: 60 };
  if (floorNumber >= 7) return { min: 12, max: 65 };
  if (floorNumber >= 4) return { min: 15, max: 70 };
  if (floorNumber === 1) return { min: 30, max: 75 };
  if (floorNumber === 2) return { min: 28, max: 72 };
  if (floorNumber === 3) return { min: 25, max: 70 };
  return { min: 20, max: 75 };
}

export function estimateTowerAttempt(
  character: Character,
  floor: FloorDefinition,
  actionId: DivineActionId = "whisper",
  revisit = false,
  preparationBuff?: PreparationBuff,
  floorIntel?: FloorIntel,
  difficultyMode: DifficultyMode = "survival",
  divineStrain = 0,
  towerPressure = 0,
): TowerEstimate {
  const contextTags = getFloorMemoryTags(floor);
  const primaryStats = floor.primaryStats ?? floor.checks.map((check) => check.stat);
  const averageStat = primaryStats.reduce((total, stat) => total + character.stats[stat], 0) / Math.max(1, primaryStats.length);
  const moraleBonus = Math.floor((character.survival.morale - 50) / 5);
  const hopeBonus = Math.floor((character.survival.hope - 50) / 5);
  const status = statusPenaltyDetails(character, floor);
  const act2Status = getAct2StatusPenaltyDetails(character, floor);
  const memoryBonus = calculateMemoryModifiers(character, contextTags);
  const traitEvolutionBonus = calculateTraitEvolutionModifier(character, contextTags, actionId);
  const divineBonus = Math.max(0, divineActionBonus(actionId, floor, contextTags, character) - (divineStrain > 0 ? 5 : 0));
  const classPassiveBonus = getClassPassiveChanceBonus(character, floor, actionId);
  const advancedClassBonus = getAdvancedClassChanceBonus(character, floor, actionId, towerPressure);
  const itemEffects = getItemEffectsForCharacter(character, contextTags);
  const preparationBonus = preparationBuff?.successBonus ?? 0;
  const matchingIntel = floorIntel?.expiresAfterNextTower ? floorIntel : floorIntel?.floorNumber === floor.floor ? floorIntel : undefined;
  const intelBonus = matchingIntel?.successBonus ?? 0;
  const pressureEffects = getTowerPressureEffects(towerPressure);
  const pressurePenalty = getAct2PressurePenalty(pressureEffects.successChancePenalty, floor);
  const advancedClassSynergy = getAdvancedClassFloorSynergy(character, floor, actionId);
  const act2FloorModifier = getAct2FloorSpecificModifier(character, floor, matchingIntel, towerPressure);
  const act2Preparedness = getAct2PreparednessModifier(floor, matchingIntel, preparationBuff, itemEffects, advancedClassSynergy.bonus);
  const act2Hooks = getAct2FloorHooks({ character, floor, towerPressure });
  const floorPressure = floor.floor * 3;
  const firstFloorGuidanceBonus = floor.floor === 1 && !revisit && character.maxFloorCleared === 0 && towerPressure <= 2 ? 8 : 0;
  const preparedness =
    averageStat * 5 +
    moraleBonus +
    hopeBonus +
    classBonus(character, floor, revisit) +
    traitBonus(character, floor) +
    memoryBonus +
    traitEvolutionBonus +
    relationshipBonus(character, actionId) +
    classPassiveBonus +
    advancedClassBonus +
    advancedClassSynergy.bonus +
    advancedClassSynergy.drawback +
    status.total +
    act2Status.total -
    floorPressure;
  const difficulty = floor.difficulty ?? 80;
  const settings = difficultySettings[difficultyMode];
  const baseChance = 35;
  const rawChance =
    baseChance +
    (preparedness - difficulty) * 0.35 +
    divineBonus +
    preparationBonus +
    intelBonus +
    itemEffects.successBonus +
    pressurePenalty +
    act2Preparedness.successModifier +
    act2FloorModifier.successModifier +
    act2Hooks.successBonus +
    firstFloorGuidanceBonus +
    settings.successChanceModifier;
  const limits = floorClamp(floor.floor);
  const chance = clamp(Math.round(rawChance), limits.min, limits.max);
  const riskLabel = chance >= 70 ? "มีโอกาสดี" : chance >= 50 ? "พอเสี่ยงได้" : chance >= 35 ? "อันตราย" : "ไม่ควรฝืน";
  const advice =
    chance >= 70
      ? "สภาพโดยรวมพร้อมพอ แต่หอคอยยังไม่เคยปล่อยใครผ่านฟรี"
      : chance >= 50
        ? "พอเสี่ยงได้ แต่การพัก ซื้ออาหาร หรือเตรียมอุปกรณ์จะช่วยได้มาก"
        : chance >= 35
          ? floor.recommendedPreparationTh ?? "ควรพัก รักษาบาดแผล หรือเตรียมอุปกรณ์ก่อนขึ้นหอคอย"
          : "ควรพักผ่อน ซื้ออาหาร รักษาบาดแผล หรือเตรียมอุปกรณ์ก่อนขึ้นหอคอย";
  return {
    chance,
    rawChance: Math.round(rawChance),
    baseChance,
    preparedness: Math.round(preparedness),
    difficulty,
    relevantStatScore: Math.round(averageStat * 5),
    divineBonus,
    intelBonus,
    preparationBonus,
    towerPressurePenalty: pressurePenalty,
    riskLabel,
    advice,
    penalties: [...status.details, ...act2Status.details],
    reasons: [
      ...(floor.floor >= 11 ? [...advancedClassSynergy.reasons, ...act2Preparedness.reasons, ...act2FloorModifier.reasons, ...act2Hooks.resultExplanationLines] : []),
      ...status.reasons,
      ...act2Status.reasons,
      ...(matchingIntel && matchingIntel.successBonus !== 0
        ? [matchingIntel.isFalse ? "ข้อมูลที่ได้มาอาจทำให้ประเมินชั้นนี้ผิดทิศ" : "ข้อมูลที่ได้มาช่วยให้เตรียมรับมือชั้นนี้ดีขึ้น"]
        : []),
      ...(towerPressure >= 8 ? ["ความกดดันของหอคอยกำลังบิดเบือนเส้นทาง"] : []),
      ...(firstFloorGuidanceBonus > 0 ? ["ความระวังแรกเริ่มช่วยให้เขาไม่ประมาทเกินไป"] : []),
      ...(floor.uniqueMechanicTh ? [floor.uniqueMechanicTh] : []),
      ...(getClassPassiveReason(character, floor, actionId) ? [getClassPassiveReason(character, floor, actionId)!] : []),
      ...(getAdvancedClassReason(character, floor, actionId, towerPressure) ? [getAdvancedClassReason(character, floor, actionId, towerPressure)!] : []),
      ...advancedClassSynergy.reasons,
      ...act2Preparedness.reasons,
      ...act2FloorModifier.reasons,
      ...(towerPressure >= 8 && floor.floor >= 11 ? ["เมืองร้างเหนือประตูแรกตอบสนองต่อความลังเลแรงกว่าเดิม ถนนและกฎของมันยิ่งบิดเบี้ยว"] : []),
      ...itemEffects.reasons,
    ].slice(0, 4),
  };
}

function mutateStat(character: Character, stat: StatKey, amount: number): void {
  character.stats[stat] = clamp(character.stats[stat] + amount, 1, 25);
}

function mutateSurvival(character: Character, key: SurvivalKey, amount: number): void {
  character.survival[key] = clamp(character.survival[key] + amount, 0, 100);
}

function scaled(value: number, multiplier: number): number {
  return Math.max(0, Math.round(value * multiplier));
}

function getOutcomeText(floor: FloorDefinition, level: FloorResultLevel): { summary: string; journal: string } {
  if (floor.floor === 10) {
    if (level === "greatSuccess") {
      return {
        summary: "ประตูแรกเปิดออกโดยไม่มีเสียงชัยชนะ มีเพียงแสงอำพันที่ยอมรับว่าเขาไม่ใช่คนเดิมที่ก้าวเข้าหอคอยในวันแรก",
        journal: "เขาไม่ได้ชนะเพราะไร้ความกลัว เขาชนะเพราะแม้ความกลัวยังอยู่ เขาก็ยังเลือกก้าวต่อ และประตูแรกก็เปิดออก",
      };
    }
    if (level === "success") {
      return {
        summary: "ผู้เฝ้าประตูถอยออกไปเพียงครึ่งก้าว มากพอให้เขาผ่าน แต่ไม่มากพอให้ลืมว่าชัยชนะครั้งนี้เฉียดความพินาศเพียงใด",
        journal: "ประตูแรกเปิดออกอย่างหวุดหวิด เขาผ่านไปได้พร้อมลมหายใจที่ขาดช่วง และความเข้าใจว่าหอคอยเริ่มรู้จักเขาแล้ว",
      };
    }
    if (level === "costlySuccess") {
      return {
        summary: "ประตูยอมเปิด แต่ไม่เคยเปิดให้ใครโดยไม่เรียกเก็บบางสิ่ง เลือด ความกลัว และชื่อเดิมบางส่วนถูกทิ้งไว้หน้าธรณีประตู",
        journal: "เขาผ่านประตูแรกมาได้ แต่ราคาของมันติดอยู่บนร่างและในใจ ไม่มีชัยชนะใดในหอคอยที่สะอาดจริง",
      };
    }
    if (level === "criticalFailure") {
      return {
        summary: "ผู้เฝ้าประตูไม่ได้ฆ่าเขา มันเพียงทำให้เขาเห็นชัดว่าตนเองยังไม่พร้อม แล้วส่งเขากลับมาพร้อมความเจ็บที่หนักพอจะจำ",
        journal: "ประตูแรกไม่ขยับ ไม่ใช่เพราะเขาไม่พยายาม แต่เพราะหอคอยยังไม่ยอมรับว่าเขาพร้อมจะผ่านไป",
      };
    }
    return {
      summary: "ประตูแรกยังนิ่งสนิท ผู้เฝ้าประตูไม่กล่าวคำเยาะเย้ย เพราะความเงียบนั้นทำร้ายได้ลึกกว่าเสียงหัวเราะ",
      journal: "ประตูแรกไม่ขยับ ไม่ใช่เพราะเขาไม่พยายาม แต่เพราะหอคอยยังไม่ยอมรับว่าเขาพร้อมจะผ่านไป",
    };
  }
  if (level === "greatSuccess") {
    return {
      summary: floor.floor === 1 ? "เขาผ่านประตูแรกโดยยังคุมลมหายใจไว้ได้ แม้หอคอยจะพยายามทำให้เขาคุกเข่า" : floor.outcomes.success,
      journal: floor.journal.success,
    };
  }
  if (level === "success") return { summary: floor.outcomes.success, journal: floor.journal.success };
  if (level === "costlySuccess") {
    return {
      summary:
        floor.floor === 1
          ? "เขาผ่านประตูแรกมาได้ แต่ไม่ใช่โดยไร้ราคา บาดแผลเล็กๆ บนฝ่ามือทำให้เขาเข้าใจทันทีว่า หอคอยนี้ไม่ได้ตั้งใจจะปล่อยใครกลับไปง่ายๆ"
          : floor.outcomes.mixed,
      journal: floor.journal.mixed,
    };
  }
  if (level === "criticalFailure") {
    return {
      summary:
        floor.floor === 2
          ? "ความมืดไม่ได้โจมตีเขาด้วยกรงเล็บ แต่มันทำให้เขาลืมหายใจ เขาหนีกลับมาได้เพียงเพราะสัญชาตญาณสุดท้าย แต่แววตาของเขาไม่เหมือนเดิมอีกแล้ว"
          : floor.outcomes.failure,
      journal: floor.journal.failure,
    };
  }
  return {
    summary:
      floor.floor === 1
        ? "เขาก้าวผ่านประตูแรกได้ไม่กี่ก้าว ก่อนพื้นหินใต้เท้าจะยุบตัวลง เสียงกระซิบจากหอคอยเหมือนหัวเราะเบาๆ เขารอดกลับมาได้ แต่ขาของเขายังสั่นไม่หยุด"
        : floor.outcomes.failure,
    journal: floor.journal.failure,
  };
}

export function resolveFloor(
  character: Character,
  floor: FloorDefinition,
  actionId: DivineActionId,
  revisit = false,
  preparationBuff?: PreparationBuff,
  floorIntel?: FloorIntel,
  difficultyMode: DifficultyMode = "survival",
  divineStrain = 0,
  towerPressure = 0,
  encounterOptions?: EncounterResolutionOptions,
  act2Context?: { npcs?: NPC[]; lifeDebtMarks?: number },
): { character: Character; result: FloorResult } {
  const action = divineActions.find((item) => item.id === actionId) ?? divineActions[0];
  const before: Character = structuredClone(character);
  let nextCharacter: Character = structuredClone(character);
  const settings = difficultySettings[difficultyMode];
  const encounterNotes: string[] = [];
  let encounterChanceBonus = encounterOptions?.midpointModifier?.successBonus ?? 0;
  let encounterInjuryModifier = encounterOptions?.midpointModifier?.injuryRiskModifier ?? 0;
  let encounterMoraleModifier = encounterOptions?.midpointModifier?.moraleModifier ?? 0;
  let encounterFatigueModifier = encounterOptions?.midpointModifier?.fatigueModifier ?? 0;
  const midpointReasonTags = (encounterOptions?.midpointTags ?? [])
    .filter((tag) => tag.startsWith("reason:"))
    .map((tag) => tag.replace("reason:", ""));
  encounterNotes.push(...midpointReasonTags);

  if (encounterOptions?.decision === "push") {
    encounterChanceBonus += 10;
    encounterInjuryModifier += 15;
    encounterNotes.push("การฝืนเสี่ยงเพิ่มโอกาสผ่าน แต่ทำให้บาดแผลรุนแรงขึ้นหากพลาด");
  }
  if (encounterOptions?.decision === "resource") {
    const useEquipped = (itemId: string) => {
      nextCharacter.inventory = (nextCharacter.inventory ?? [])
        .map((entry) => (entry.itemId === itemId ? { ...entry, quantity: entry.quantity - 1 } : entry))
        .filter((entry) => entry.quantity > 0);
      if (!nextCharacter.inventory.some((entry) => entry.itemId === itemId)) {
        nextCharacter.equippedItems = (nextCharacter.equippedItems ?? []).filter((id) => id !== itemId);
      }
    };
    const equipped = nextCharacter.equippedItems ?? [];
    const contextTags = getFloorMemoryTags(floor);
    if (equipped.includes("dry_bread")) {
      useEquipped("dry_bread");
      mutateSurvival(nextCharacter, "hunger", -18);
      encounterChanceBonus += 6;
      encounterNotes.push("ขนมปังแห้งช่วยให้เขาตั้งสติกลางหอคอยได้อีกครั้ง");
    } else if (equipped.includes("rough_bandage") && nextCharacter.survival.injury >= 20) {
      useEquipped("rough_bandage");
      mutateSurvival(nextCharacter, "injury", -15);
      mutateSurvival(nextCharacter, "fatigue", 3);
      encounterInjuryModifier -= 8;
      encounterNotes.push("ผ้าพันแผลหยาบถูกใช้กดบาดแผลไว้ แม้ทุกก้าวจะยังเจ็บ");
    } else if (equipped.includes("bitter_medicine") && nextCharacter.survival.sickness >= 20) {
      useEquipped("bitter_medicine");
      mutateSurvival(nextCharacter, "sickness", -15);
      mutateSurvival(nextCharacter, "morale", -2);
      encounterChanceBonus += 4;
      encounterNotes.push("ยาขมทำให้ลมหายใจนิ่งขึ้น แม้รสชาติจะพรากสีหน้าไปจากเขา");
    } else if (equipped.includes("cracked_lantern") && contextTags.some((tag) => ["darkness", "fear"].includes(tag))) {
      encounterChanceBonus += 10;
      encounterMoraleModifier += 2;
      if (chance(20)) {
        nextCharacter.inventory = (nextCharacter.inventory ?? []).filter((entry) => entry.itemId !== "cracked_lantern");
        nextCharacter.equippedItems = equipped.filter((id) => id !== "cracked_lantern");
        encounterNotes.push("ตะเกียงร้าวให้แสงพอจะเห็นขอบเขตของความมืด ก่อนจะแตกดับในมือ");
      } else {
        encounterNotes.push("ตะเกียงร้าวทำให้ความมืดมีขอบเขตขึ้นมาเล็กน้อย");
      }
    } else if (equipped.includes("old_rope") && contextTags.some((tag) => ["trap", "pit", "bridge", "climb"].includes(tag))) {
      encounterInjuryModifier -= 20;
      encounterChanceBonus += 4;
      if (chance(15)) {
        nextCharacter.inventory = (nextCharacter.inventory ?? []).filter((entry) => entry.itemId !== "old_rope");
        nextCharacter.equippedItems = equipped.filter((id) => id !== "old_rope");
        encounterNotes.push("เชือกเก่าช่วยรั้งเขาไว้ได้ครั้งหนึ่ง ก่อนจะขาดเป็นเส้นฝอย");
      } else {
        encounterNotes.push("เชือกเก่าช่วยลดความเสี่ยงจากกับดักและพื้นต่างระดับ");
      }
    } else if (nextCharacter.food > 0) {
      nextCharacter.food = Math.max(0, nextCharacter.food - 1);
      mutateSurvival(nextCharacter, "hunger", -14);
      encounterChanceBonus += 6;
      encounterFatigueModifier -= 2;
      encounterNotes.push("อาหารที่ใช้กลางทางช่วยให้เขาตั้งสติและลดแรงกดจากความหิว");
    } else if (nextCharacter.gold >= 5) {
      nextCharacter.gold = Math.max(0, nextCharacter.gold - 5);
      encounterChanceBonus += 4;
      encounterNotes.push("ทองเล็กน้อยถูกใช้แลกทางรอดชั่วคราวในชั้นนี้");
    } else {
      encounterNotes.push("เขาพยายามใช้สิ่งที่มี แต่ทรัพยากรเหลือน้อยเกินกว่าจะช่วยได้จริง");
    }
    if (preparationBuff) {
      encounterChanceBonus += 4;
      encounterInjuryModifier -= 5;
      encounterNotes.push("อุปกรณ์ที่เตรียมไว้ถูกใช้ถูกจังหวะและช่วยลดความเสี่ยง");
    }
    if (floorIntel?.floorNumber === floor.floor) {
      encounterChanceBonus += floorIntel.isFalse ? -3 : 3;
      encounterNotes.push(floorIntel.isFalse ? "ข้อมูลที่สืบมาเริ่มนำเขาไปผิดทาง" : "ข้อมูลที่สืบมาช่วยยืนยันการตัดสินใจช่วงสุดท้าย");
    }
  }
  if (encounterOptions?.decision === "classAction") {
    const actionCost = applyClassActionCost(nextCharacter, floor);
    nextCharacter = actionCost.character;
    encounterNotes.push(getClassActionReason(nextCharacter), ...actionCost.notes);
  }
  const matchingIntel = floorIntel?.expiresAfterNextTower ? floorIntel : floorIntel?.floorNumber === floor.floor ? floorIntel : undefined;
  const contextTags = getFloorMemoryTags(floor);
  const itemEffects = getItemEffectsForCharacter(nextCharacter, contextTags);
  const pressureEffects = getTowerPressureEffects(towerPressure);
  const act2Synergy = getAdvancedClassFloorSynergy(nextCharacter, floor, action.id);
  const act2FloorModifier = getAct2FloorSpecificModifier(nextCharacter, floor, matchingIntel, towerPressure);
  const act2Preparedness = getAct2PreparednessModifier(floor, matchingIntel, preparationBuff, itemEffects, act2Synergy.bonus);
  const act2Hooks = getAct2FloorHooks({ character: nextCharacter, floor, npcs: act2Context?.npcs, lifeDebtMarks: act2Context?.lifeDebtMarks, towerPressure });
  const previewAct2Hooks = getAct2FloorHooks({ character: nextCharacter, floor, towerPressure });
  encounterChanceBonus += act2Hooks.successBonus - previewAct2Hooks.successBonus;
  encounterInjuryModifier += act2Preparedness.injuryRiskModifier + act2FloorModifier.injuryRiskModifier + (act2Hooks.injuryRiskModifier - previewAct2Hooks.injuryRiskModifier);
  encounterNotes.push(...act2Synergy.reasons, ...act2Preparedness.reasons, ...act2FloorModifier.reasons, ...act2Hooks.specialLinesTh, ...act2Hooks.resultExplanationLines);
  const estimate = estimateTowerAttempt(nextCharacter, floor, action.id, revisit, preparationBuff, matchingIntel, difficultyMode, divineStrain, towerPressure);
  const rollValue = Math.floor(Math.random() * 100) + 1;
  const finalChance = clamp(Math.round(estimate.chance + encounterChanceBonus), floorClamp(floor.floor).min, floorClamp(floor.floor).max);
  const margin = finalChance - rollValue;
  const level: FloorResultLevel =
    margin >= 25
      ? "greatSuccess"
      : margin >= 10
        ? "success"
        : margin >= 0
          ? "costlySuccess"
          : margin <= -25
            ? "criticalFailure"
            : "failure";
  const effects: string[] = [];

  Object.entries(action.relationshipChanges).forEach(([key, value]) => {
    nextCharacter.divine[key as keyof Character["divine"]] = clamp(nextCharacter.divine[key as keyof Character["divine"]] + (value ?? 0), 0, 100);
  });
  Object.entries(action.survivalChanges).forEach(([key, value]) => mutateSurvival(nextCharacter, key as SurvivalKey, value ?? 0));

  const sicknessFatigue = nextCharacter.survival.sickness >= 20 ? Math.floor(Math.random() * 6) + 5 : 0;
  const attemptCost = getTowerAttemptSurvivalCost(floor.floor, revisit);
  const baseHunger = attemptCost.hunger;
  const baseFatigue = attemptCost.fatigue + sicknessFatigue;
  mutateSurvival(nextCharacter, "hunger", baseHunger);
  mutateSurvival(nextCharacter, "fatigue", baseFatigue);
  if (nextCharacter.survival.injury >= 40 && chance(nextCharacter.survival.injury >= 70 ? 35 : 18)) mutateSurvival(nextCharacter, "injury", 5);

  const rewardMultiplier = settings.rewardMultiplier;
  const penaltyMultiplier = settings.penaltyMultiplier;
  const injuryReduction = (preparationBuff?.injuryRiskReduction ?? 0) + (matchingIntel?.injuryRiskReduction ?? 0) + itemEffects.injuryRiskReduction;
  const pressureInjury = getAct2PressurePenalty(pressureEffects.injuryRiskBonus, floor) + encounterInjuryModifier;
  let resolvedLevel = level;
  if (resolvedLevel === "criticalFailure" && itemEffects.criticalProtection && nextCharacter.equippedItems.includes("broken_charm")) {
    resolvedLevel = "failure";
    nextCharacter.inventory = nextCharacter.inventory.filter((entry) => entry.itemId !== "broken_charm");
    nextCharacter.equippedItems = nextCharacter.equippedItems.filter((itemId) => itemId !== "broken_charm");
    effects.push("เครื่องรางแตกละเอียดในมือ ก่อนที่หอคอยจะเรียกเก็บราคาที่รุนแรงกว่านี้");
  }
  const clearFloor = resolvedLevel === "greatSuccess" || resolvedLevel === "success" || resolvedLevel === "costlySuccess";

  if (clearFloor) {
    const rewardScale = resolvedLevel === "greatSuccess" ? 1 : resolvedLevel === "success" ? 0.85 : 0.55;
    const rawGoldReward = Math.max(0, Math.round(floor.rewards.gold * rewardMultiplier * rewardScale));
    const earlyGoldFloor = floor.floor === 1 ? Math.max(rawGoldReward, 5) : floor.floor === 2 ? Math.max(rawGoldReward, 6) : floor.floor === 3 ? Math.max(rawGoldReward, 7) : rawGoldReward;
    nextCharacter.gold += earlyGoldFloor;
    nextCharacter.food += Math.max(0, Math.round(floor.rewards.food * rewardMultiplier * (resolvedLevel === "costlySuccess" ? 0.5 : 1))) + (nextCharacter.classId === "hunter" && resolvedLevel !== "costlySuccess" ? 1 : 0);
    mutateSurvival(nextCharacter, "morale", resolvedLevel === "greatSuccess" ? 8 : resolvedLevel === "success" ? 4 : -6);
    mutateSurvival(nextCharacter, "hope", resolvedLevel === "greatSuccess" ? 8 : resolvedLevel === "success" ? 4 : 1);
    if (resolvedLevel === "costlySuccess") {
      mutateSurvival(nextCharacter, "fatigue", scaled(8 + floor.floor, penaltyMultiplier));
      mutateSurvival(nextCharacter, "injury", Math.max(0, scaled(4 + floor.floor, penaltyMultiplier) + pressureInjury - injuryReduction));
      effects.push("ผ่านชั้นนี้ได้ แต่ร่างกายและใจต้องจ่ายราคา");
    } else {
      effects.push(resolvedLevel === "greatSuccess" ? "ผ่านชั้นนี้อย่างเหนือความคาดหมายและเสียหายน้อยกว่าที่กลัว" : "ผ่านชั้นนี้ได้ แต่หอคอยยังทิ้งรอยกดไว้บนร่างกาย");
    }
    if (floor.floor === 10) {
      if (resolvedLevel === "greatSuccess") {
        mutateSurvival(nextCharacter, "morale", 4);
        mutateSurvival(nextCharacter, "hope", 4);
        effects.push("ประตูแรกเปิดออกอย่างงดงาม ความหวังและขวัญกำลังใจเพิ่มขึ้นมาก");
      } else if (resolvedLevel === "success") {
        nextCharacter.gold = Math.max(0, nextCharacter.gold - 2);
        mutateSurvival(nextCharacter, "morale", 2);
        mutateSurvival(nextCharacter, "hope", 4);
        mutateSurvival(nextCharacter, "fatigue", 10);
        if (chance(45)) mutateSurvival(nextCharacter, "injury", 5);
        effects.push("ผ่านประตูแรกอย่างหวุดหวิด ร่างกายล้า แต่ความหวังยังลุกขึ้นมา");
      } else {
        nextCharacter.gold = Math.max(0, nextCharacter.gold - 1);
        mutateSurvival(nextCharacter, "morale", 8);
        mutateSurvival(nextCharacter, "hope", 5);
        mutateSurvival(nextCharacter, "injury", 6 + Math.floor(Math.random() * 6));
        effects.push("ราคาของประตูแรกทิ้งรอยลึกไว้ แต่ประตูก็ยอมเปิด");
      }
    }
    if (floor.floor === 20) {
      mutateSurvival(nextCharacter, "morale", resolvedLevel === "costlySuccess" ? 8 : 4);
      mutateSurvival(nextCharacter, "hope", resolvedLevel === "costlySuccess" ? 7 : 4);
      effects.push("นายทะเบียนแห่งเมืองร้างยอมปิดสมุด ความหวังและขวัญกำลังใจกลับมาพอให้เขาก้าวสู่ชั้นต่อไป");
    }
    if (encounterOptions?.decision === "self") {
      nextCharacter.divine.independence = clamp(nextCharacter.divine.independence + 2, 0, 100);
      mutateSurvival(nextCharacter, "morale", 1);
      effects.push("เขาตัดสินใจช่วงสุดท้ายด้วยตนเองและยืนหยัดได้มากขึ้น");
    }
    Object.entries(floor.rewards.statBoost ?? {}).forEach(([stat, amount]) => {
      if (resolvedLevel === "greatSuccess" || chance(resolvedLevel === "success" ? 45 : 20)) mutateStat(nextCharacter, stat as StatKey, amount ?? 0);
    });
    nextCharacter.maxFloorCleared = Math.max(nextCharacter.maxFloorCleared, floor.floor);
    nextCharacter.currentFloor = Math.min(20, nextCharacter.maxFloorCleared + 1);
    const classSuccess = applyClassSuccessPassives(nextCharacter, floor, resolvedLevel, revisit, encounterOptions?.decision === "classAction");
    nextCharacter = classSuccess.character;
    effects.push(...classSuccess.notes);
    const skillUnlocks = unlockClassSkills(nextCharacter, floor.floor);
    nextCharacter = skillUnlocks.character;
    effects.push(...skillUnlocks.unlocked.map((skill) => `เรียนรู้ความสามารถใหม่: ${skill.nameTh}`));
  } else {
    const consequences = floor.failureConsequences;
    const critical = resolvedLevel === "criticalFailure";
    const goldLoss = critical ? 6 : nextCharacter.classId === "rogue" ? 2 : 4;
    nextCharacter.gold = Math.max(0, nextCharacter.gold - goldLoss);
    mutateSurvival(nextCharacter, "fatigue", scaled((critical ? 20 : 10) + (consequences?.fatigue ?? 10), penaltyMultiplier));
    mutateSurvival(nextCharacter, "hunger", scaled((critical ? 8 : 5) + (consequences?.hunger ?? 5), penaltyMultiplier));
    mutateSurvival(nextCharacter, "injury", Math.max(0, scaled((critical ? 15 : 5) + (consequences?.injury ?? 8), penaltyMultiplier) + pressureInjury - injuryReduction));
    mutateSurvival(nextCharacter, "morale", -scaled((critical ? 10 : 5) + (consequences?.morale ?? 8), penaltyMultiplier));
    mutateSurvival(nextCharacter, "hope", -scaled(critical ? 14 : 7, penaltyMultiplier));
    if (encounterOptions?.decision === "push") {
      mutateSurvival(nextCharacter, "injury", scaled(10 + floor.floor, penaltyMultiplier));
      mutateSurvival(nextCharacter, "morale", -scaled(5, penaltyMultiplier));
      effects.push("การฝืนเสี่ยงทำให้ความล้มเหลวทิ้งรอยแผลลึกกว่าเดิม");
    }
    if (encounterOptions?.decision === "self") {
      mutateSurvival(nextCharacter, "morale", -3);
      effects.push("การปล่อยให้เขาตัดสินใจเองทำให้ความผิดพลาดกระแทกใจเขาโดยตรง");
    }
    if ((consequences?.sicknessChance && chance(consequences.sicknessChance + (critical ? 20 : 0))) || (critical && floor.challengeType === "survival")) {
      mutateSurvival(nextCharacter, "sickness", scaled(critical ? 12 : 7, penaltyMultiplier) + Math.floor(pressureEffects.sicknessRiskBonus / 3));
    }
    const act2Failure = getAct2FailureAdjustments(floor, critical, act2Preparedness, {
      moraleFailurePenalty: act2FloorModifier.moraleFailurePenalty + act2Hooks.moraleFailureModifier,
      hopeFailurePenalty: act2FloorModifier.hopeFailurePenalty + act2Hooks.hopeFailureModifier,
      sicknessFailureBonus: act2FloorModifier.sicknessFailureBonus + act2Hooks.sicknessFailureModifier,
    });
    if (act2Failure.fatigue > 0) mutateSurvival(nextCharacter, "fatigue", scaled(act2Failure.fatigue, penaltyMultiplier));
    if (act2Failure.injury > 0) mutateSurvival(nextCharacter, "injury", scaled(act2Failure.injury, penaltyMultiplier));
    if (act2Failure.morale > 0) mutateSurvival(nextCharacter, "morale", -scaled(act2Failure.morale, penaltyMultiplier));
    if (act2Failure.hope > 0) mutateSurvival(nextCharacter, "hope", -scaled(act2Failure.hope, penaltyMultiplier));
    if (act2Failure.sickness > 0) mutateSurvival(nextCharacter, "sickness", scaled(act2Failure.sickness, penaltyMultiplier));
    effects.push(...act2Failure.effects);
    effects.push(critical ? `ล้มเหลวอย่างรุนแรงและเสียทอง ${goldLoss}` : `ถอยกลับจากชั้นนี้และเสียทอง ${goldLoss}`);
    const classFailure = applyClassFailurePassives(nextCharacter, floor, resolvedLevel);
    nextCharacter = classFailure.character;
    effects.push(...classFailure.notes);
  }

  if (encounterFatigueModifier !== 0) mutateSurvival(nextCharacter, "fatigue", scaled(Math.max(0, encounterFatigueModifier), penaltyMultiplier) || encounterFatigueModifier);
  if (encounterMoraleModifier !== 0) mutateSurvival(nextCharacter, "morale", encounterMoraleModifier);
  effects.push(...encounterNotes);

  if (action.id === "whisper" && clearFloor && chance(resolvedLevel === "greatSuccess" ? 75 : 45)) {
    nextCharacter.divine.faith = clamp(nextCharacter.divine.faith + 1, 0, 100);
    effects.push("เสียงกระซิบทำให้ศรัทธาเพิ่มขึ้นเล็กน้อย");
  }
  if (action.id === "omen" && !clearFloor) {
    mutateSurvival(nextCharacter, "injury", -10);
    effects.push("ลางบอกเหตุช่วยลดความเสียหายจากอันตรายที่มองไม่เห็น");
  }
  if (action.id === "blessing") {
    nextCharacter.divine.faith = clamp(nextCharacter.divine.faith + 1, 0, 100);
    effects.push("พรแห่งเทพช่วยมาก แต่ทิ้งแรงตึงไว้บนสายสัมพันธ์กับเทพ");
  }
  if (action.id === "silence") {
    if (clearFloor) {
      nextCharacter.divine.independence = clamp(nextCharacter.divine.independence + 2, 0, 100);
      mutateSurvival(nextCharacter, "morale", 1);
      effects.push("ความเงียบเปิดพื้นที่ให้เขายืนหยัดด้วยตนเอง");
    } else {
      mutateSurvival(nextCharacter, "morale", -3);
      if (resolvedLevel === "criticalFailure") mutateSurvival(nextCharacter, "injury", scaled(6, penaltyMultiplier));
    }
  }

  if (matchingIntel?.isFalse) {
    effects.push("เมื่อทุกอย่างเริ่มผิดทิศ เขาจึงเข้าใจว่าข้อมูลนั้นไม่เคยเป็นความจริงตั้งแต่แรก");
    mutateSurvival(nextCharacter, "morale", -3);
  } else if (matchingIntel) {
    effects.push("ข้อมูลที่สืบมาได้ช่วยให้เขาอ่านอันตรายบางส่วนออกก่อนสายเกินไป");
  }

  if (nextCharacter.survival.hunger >= 60) mutateSurvival(nextCharacter, "morale", nextCharacter.survival.hunger >= 80 ? -3 : -1);
  if (nextCharacter.survival.hunger >= 80 && chance(nextCharacter.survival.hunger >= 95 ? 25 : 10)) mutateSurvival(nextCharacter, "sickness", 6);
  if (nextCharacter.survival.fatigue >= 60 && chance(nextCharacter.survival.fatigue >= 80 ? 25 : 10)) mutateSurvival(nextCharacter, "injury", 5);

  effects.push(...itemEffects.reasons);
  const text = getOutcomeText(floor, resolvedLevel);
  const changeLines = describeChanges(before, nextCharacter);
  const baseResult: FloorResult = {
    level: resolvedLevel,
    score: finalChance,
    threshold: rollValue,
    floor: floor.floor,
    title: floor.title,
    summary: text.summary,
    journalText: text.journal,
    actionName: action.name,
    effects: [...effects, ...changeLines],
    importantReasons: [
      ...midpointReasonTags,
      ...act2Hooks.resultExplanationLines,
      ...buildImportantReasons(nextCharacter, floor, action.id, estimate, matchingIntel, preparationBuff, towerPressure),
      ...(encounterOptions?.decision === "push" ? ["การฝืนเสี่ยงเพิ่มแรงส่ง แต่ทำให้ราคาของความผิดพลาดสูงขึ้น"] : []),
      ...(encounterOptions?.decision === "resource" ? ["ทรัพยากรที่ใช้กลางทางเปลี่ยนจังหวะของการเอาตัวรอด"] : []),
      ...(encounterOptions?.decision === "self" ? ["การปล่อยให้เขาตัดสินใจเองส่งผลต่อการยืนหยัดและบาดแผลทางใจ"] : []),
      ...(encounterOptions?.decision === "classAction" ? [getClassActionReason(nextCharacter)] : []),
      ...itemEffects.reasons,
    ].slice(0, 4),
  };
  const memoryCreated = createMemoryFromEvent(baseResult, action.id, nextCharacter, floor);
  const traitContextCharacter = memoryCreated ? { ...nextCharacter, memories: [memoryCreated, ...nextCharacter.memories].slice(0, 20) } : nextCharacter;
  const traitEvolution = updateTraitProgress({
    character: traitContextCharacter,
    floor,
    result: baseResult,
    divineAction: action.id,
  });
  const characterWithTraitChanges = {
    ...traitEvolution.character,
    memories: nextCharacter.memories,
  };
  const pathUpdate = applyPathChanges(
    characterWithTraitChanges,
    getTowerPathChanges({
      character: characterWithTraitChanges,
      floor,
      level: resolvedLevel,
      divineAction: action.id,
      decision: encounterOptions?.decision,
      floorIntel: matchingIntel,
    }),
  );
  const act2PathUpdate = applyPathChanges(pathUpdate.character, act2Hooks.pathChanges);
  const allPathChanges = [...pathUpdate.changes, ...act2PathUpdate.changes];
  const pathEffectLines = allPathChanges.length > 0 ? ["ร่องรอยของชะตา:", ...formatPathChanges(allPathChanges)] : [];

  return {
    character: act2PathUpdate.character,
    result: {
      ...baseResult,
      pathChanges: allPathChanges,
      memoryCreated: memoryCreated ?? undefined,
      traitProgressUpdates: traitEvolution.updates,
      effects: [
        ...baseResult.effects,
        ...pathEffectLines,
        ...(memoryCreated ? [`เกิดความทรงจำใหม่: ${memoryCreated.title}`] : []),
        ...traitEvolution.evolved.map((evolution) => `Trait เปลี่ยนแปลง: ${evolution.nameTh}`),
      ],
    },
  };
}

function buildImportantReasons(
  character: Character,
  floor: FloorDefinition,
  actionId: DivineActionId,
  estimate: TowerEstimate,
  intel?: FloorIntel,
  preparationBuff?: PreparationBuff,
  towerPressure = 0,
): string[] {
  const reasons: string[] = [];
  const primaryStats = floor.primaryStats ?? floor.checks.map((check) => check.stat);
  const bestStat = primaryStats.reduce((best, stat) => (character.stats[stat] > character.stats[best] ? stat : best), primaryStats[0]);
  if (bestStat) reasons.push(`${statLabels[bestStat]}ช่วยให้เขาอ่านสถานการณ์ของชั้นนี้ได้ดีขึ้น`);
  if (character.survival.hunger >= 40) reasons.push("ความหิวทำให้สมาธิและการตัดสินใจแย่ลง");
  if (character.survival.fatigue >= 40) reasons.push("ความเหนื่อยล้าทำให้การตอบสนองช้าลง");
  if (character.survival.injury >= 20) reasons.push("บาดแผลทำให้ทุกการเคลื่อนไหวมีราคา");
  if (character.survival.sickness >= 20) reasons.push("อาการป่วยทำให้ร่างกายเสียแรงเร็วกว่าปกติ");
  if (actionId === "omen") reasons.push("ลางบอกเหตุช่วยลดความเสี่ยงจากอันตรายที่ซ่อนอยู่");
  if (actionId === "blessing") reasons.push("พรแห่งเทพช่วยผลักเขาผ่านช่วงวิกฤต แต่เพิ่มการพึ่งพาเทพ");
  if (actionId === "silence") reasons.push("ความเงียบปล่อยให้เขาเติบโตด้วยการตัดสินใจของตนเอง");
  if (intel) reasons.push(intel.isFalse ? "ข้อมูลที่สืบมาได้พาเขาประเมินอันตรายผิดทิศ" : "ข้อมูลที่สืบมาได้ช่วยให้เขารู้ว่าควรระวังอะไร");
  if (preparationBuff) reasons.push("อุปกรณ์ที่เตรียมไว้ช่วยลดความเสี่ยงก่อนขึ้นหอคอย");
  if (towerPressure >= 8) reasons.push("ความกดดันของหอคอยทำให้เส้นทางบิดเบี้ยวมากขึ้น");
  if (floor.uniqueMechanicTh) reasons.push(floor.uniqueMechanicTh);
  const classReason = getClassPassiveReason(character, floor, actionId);
  if (classReason) reasons.push(classReason);
  const advancedReason = getAdvancedClassReason(character, floor, actionId, towerPressure);
  if (advancedReason) reasons.push(advancedReason);
  if (floor.floor >= 11) {
    const contextTags = getFloorMemoryTags(floor);
    const itemEffects = getItemEffectsForCharacter(character, contextTags);
    const synergy = getAdvancedClassFloorSynergy(character, floor, actionId);
    const floorSpecific = getAct2FloorSpecificModifier(character, floor, intel, towerPressure);
    const preparedness = getAct2PreparednessModifier(floor, intel, preparationBuff, itemEffects, synergy.bonus);
    reasons.push(...synergy.reasons, ...preparedness.reasons, ...floorSpecific.reasons);
  }
  if (estimate.chance < 35) reasons.push("โอกาสโดยรวมต่ำมากตั้งแต่ก่อนก้าวเข้าไป");
  return Array.from(new Set(reasons)).slice(0, 4);
}

function describeChanges(before: Character, after: Character): string[] {
  const lines: string[] = [];
  [
    { label: "ทอง", before: before.gold, after: after.gold },
    { label: "อาหาร", before: before.food, after: after.food },
  ].forEach(({ label, before: oldValue, after: newValue }) => {
    if (oldValue !== newValue) lines.push(`${label}: ${oldValue} → ${newValue} (${formatDelta(newValue - oldValue)})`);
  });

  (Object.keys(before.survival) as Array<keyof Character["survival"]>).forEach((key) => {
    if (before.survival[key] !== after.survival[key]) lines.push(`${survivalLabels[key]}: ${before.survival[key]} → ${after.survival[key]} (${formatDelta(after.survival[key] - before.survival[key])})`);
  });
  (Object.keys(before.divine) as Array<keyof Character["divine"]>).forEach((key) => {
    if (before.divine[key] !== after.divine[key]) lines.push(`${divineLabels[key]}: ${before.divine[key]} → ${after.divine[key]} (${formatDelta(after.divine[key] - before.divine[key])})`);
  });
  (Object.keys(before.stats) as Array<keyof Character["stats"]>).forEach((key) => {
    if (before.stats[key] !== after.stats[key]) lines.push(`${statLabels[key]}: ${before.stats[key]} → ${after.stats[key]} (${formatDelta(after.stats[key] - before.stats[key])})`);
  });
  return lines.length > 0 ? lines : ["ไม่มีค่าสถานะหรือทรัพยากรเปลี่ยนแปลง"];
}

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}
