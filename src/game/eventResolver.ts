import { difficultySettings } from "./difficulty";
import { divineActions } from "./divineActions";
import { divineLabels, statLabels, survivalLabels } from "./labels";
import { calculateMemoryModifiers, createMemoryFromEvent, getFloorMemoryTags } from "./memorySystem";
import { getTowerPressureEffects } from "./towerPressure";
import { calculateTraitEvolutionModifier, updateTraitProgress } from "./traitEvolution";
import { getAdvancedClassChanceBonus, getAdvancedClassReason } from "./advancedClassSystem";
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
  PreparationBuff,
  StatKey,
  SurvivalKey,
} from "../types/game";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const chance = (percent: number) => Math.random() * 100 < percent;

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
  if (floorNumber >= 10) return { min: 10, max: 60 };
  if (floorNumber >= 7) return { min: 12, max: 65 };
  if (floorNumber >= 4) return { min: 15, max: 70 };
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
  const floorPressure = floor.floor * 3;
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
    status.total -
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
    pressureEffects.successChancePenalty +
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
    towerPressurePenalty: pressureEffects.successChancePenalty,
    riskLabel,
    advice,
    penalties: status.details,
    reasons: [
      ...status.reasons,
      ...(matchingIntel && matchingIntel.successBonus !== 0
        ? [matchingIntel.isFalse ? "ข้อมูลที่ได้มาอาจทำให้ประเมินชั้นนี้ผิดทิศ" : "ข้อมูลที่ได้มาช่วยให้เตรียมรับมือชั้นนี้ดีขึ้น"]
        : []),
      ...(towerPressure >= 8 ? ["ความกดดันของหอคอยกำลังบิดเบือนเส้นทาง"] : []),
      ...(floor.uniqueMechanicTh ? [floor.uniqueMechanicTh] : []),
      ...(getClassPassiveReason(character, floor, actionId) ? [getClassPassiveReason(character, floor, actionId)!] : []),
      ...(getAdvancedClassReason(character, floor, actionId, towerPressure) ? [getAdvancedClassReason(character, floor, actionId, towerPressure)!] : []),
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

  const baseHunger = revisit ? 12 : 16;
  const sicknessFatigue = nextCharacter.survival.sickness >= 20 ? Math.floor(Math.random() * 6) + 5 : 0;
  const baseFatigue = (revisit ? 18 : 24) + floor.floor + sicknessFatigue;
  mutateSurvival(nextCharacter, "hunger", baseHunger);
  mutateSurvival(nextCharacter, "fatigue", baseFatigue);
  if (nextCharacter.survival.injury >= 40 && chance(nextCharacter.survival.injury >= 70 ? 35 : 18)) mutateSurvival(nextCharacter, "injury", 5);

  const rewardMultiplier = settings.rewardMultiplier;
  const penaltyMultiplier = settings.penaltyMultiplier;
  const injuryReduction = (preparationBuff?.injuryRiskReduction ?? 0) + (matchingIntel?.injuryRiskReduction ?? 0) + itemEffects.injuryRiskReduction;
  const pressureInjury = pressureEffects.injuryRiskBonus + encounterInjuryModifier;
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
    nextCharacter.gold += Math.max(0, Math.round(floor.rewards.gold * rewardMultiplier * rewardScale));
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
    if (encounterOptions?.decision === "self") {
      nextCharacter.divine.independence = clamp(nextCharacter.divine.independence + 2, 0, 100);
      mutateSurvival(nextCharacter, "morale", 1);
      effects.push("เขาตัดสินใจช่วงสุดท้ายด้วยตนเองและยืนหยัดได้มากขึ้น");
    }
    Object.entries(floor.rewards.statBoost ?? {}).forEach(([stat, amount]) => {
      if (resolvedLevel === "greatSuccess" || chance(resolvedLevel === "success" ? 45 : 20)) mutateStat(nextCharacter, stat as StatKey, amount ?? 0);
    });
    nextCharacter.maxFloorCleared = Math.max(nextCharacter.maxFloorCleared, floor.floor);
    nextCharacter.currentFloor = Math.min(10, nextCharacter.maxFloorCleared + 1);
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
  const pathEffectLines = pathUpdate.changes.length > 0 ? ["ร่องรอยของชะตา:", ...formatPathChanges(pathUpdate.changes)] : [];

  return {
    character: pathUpdate.character,
    result: {
      ...baseResult,
      pathChanges: pathUpdate.changes,
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
