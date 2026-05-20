import { advancedClasses } from "../data/advancedClasses";
import { getPathLabel, normalizePathAffinity } from "./pathAffinity";
import type { AdvancedClass, Character, DivineActionId, FloorDefinition, PathId } from "../types/game";

export interface NearAdvancedClass {
  advancedClass: AdvancedClass;
  missingRequirements: { pathId: PathId; label: string; current: number; required: number }[];
  closeness: number;
}

const fallbackDescriptions: Record<string, string> = {
  fighter: "นักสู้ที่ผ่านประตูแรกด้วยร่างกายและเจตจำนงที่ยังไม่แตกหน่อเป็นเส้นทางเฉพาะ",
  guard: "ผู้พิทักษ์ที่ยังไม่รู้ว่าจะปกป้องสิ่งใด แต่รู้แล้วว่าตนเองยังยืนอยู่ได้",
  scout: "นักสำรวจที่ผ่านประตูแรกมาได้โดยยังไม่พบชื่อที่แท้จริงของเส้นทางตนเอง",
  hunter: "นักล่าที่ยังไม่รู้ว่าจะล่าหรือถูกล่า แต่ไม่ใช่เหยื่อไร้ทางเลือกอีกต่อไป",
  acolyte: "ผู้ศรัทธาที่ยังไม่รู้ว่าเสียงของเทพจะนำไปทางใด แต่ประตูแรกได้เปลี่ยนเขาแล้ว",
  scholar: "นักปราชญ์ที่ยังอ่านความหมายของชะตาไม่ครบ แต่รู้ว่าหอคอยมีภาษาให้ถอดรหัสต่อ",
  tinker: "ช่างประดิษฐ์ที่ยังประกอบชะตาของตนไม่เสร็จ แต่ผ่านประตูแรกมาด้วยสองมือของตนเอง",
  rogue: "เงาเร้นที่ยังไม่เลือกว่าจะเป็นเงาของอะไร แต่หอคอยจำได้แล้วว่าเขารอดมาได้",
};

export function getAdvancedClass(character: Character): AdvancedClass | undefined {
  if (!character.advancedClassId) return undefined;
  return advancedClasses.find((advancedClass) => advancedClass.id === character.advancedClassId) ?? getFallbackAdvancedClass(character);
}

export function getEligibleAdvancedClasses(character: Character): AdvancedClass[] {
  const affinity = normalizePathAffinity(character.pathAffinity);
  return advancedClasses.filter((advancedClass) => {
    if (advancedClass.baseClassId !== character.classId) return false;
    if (character.advancedClassId) return false;
    if (advancedClass.forbiddenTraits?.some((traitId) => character.traits.some((trait) => trait.id === traitId))) return false;
    return advancedClass.requiredPaths.every((requirement) => affinity[requirement.pathId] >= requirement.minimum);
  });
}

export function getNearAdvancedClasses(character: Character, limit = 2): NearAdvancedClass[] {
  const affinity = normalizePathAffinity(character.pathAffinity);
  return advancedClasses
    .filter((advancedClass) => advancedClass.baseClassId === character.classId)
    .map((advancedClass) => {
      const missingRequirements = advancedClass.requiredPaths
        .filter((requirement) => affinity[requirement.pathId] < requirement.minimum)
        .map((requirement) => ({
          pathId: requirement.pathId,
          label: getPathLabel(requirement.pathId),
          current: affinity[requirement.pathId],
          required: requirement.minimum,
        }));
      const closeness = advancedClass.requiredPaths.reduce((total, requirement) => total + Math.min(1, affinity[requirement.pathId] / requirement.minimum), 0);
      return { advancedClass, missingRequirements, closeness };
    })
    .filter((item) => item.missingRequirements.length > 0)
    .sort((a, b) => b.closeness - a.closeness)
    .slice(0, limit);
}

export function getFallbackAdvancedClass(character: Character): AdvancedClass {
  return {
    id: `first-gate-${character.classId}`,
    baseClassId: character.classId,
    nameTh: "ผู้ผ่านประตูแรก",
    titleTh: "ชะตาที่ยังไม่ชัดเจน",
    descriptionTh: fallbackDescriptions[character.classId] ?? "ผู้หลงทางที่ผ่านประตูแรกมาได้ แต่เส้นทางใหม่ยังไม่ชัดเจนพอ",
    requiredPaths: [],
    passiveTh: "ได้รับโบนัสเล็กน้อยกับการท้าทายหอคอยทุกประเภท แต่ไม่มีความเชี่ยวชาญเฉพาะทาง",
    drawbackTh: "ไม่เปิดทางเล่นเฉพาะเหมือนคลาสขั้นสองสายพิเศษ",
    effects: { successBonus: 2 },
    classActionTh: "ตั้งหลักใหม่ — ลดความสับสนเล็กน้อยในจังหวะเสี่ยง แต่ไม่เปลี่ยนผลลัพธ์มากนัก",
    unlockNarrativeTh: "ชะตายังไม่ชัดเจนพอ แม้จะผ่านประตูแรกมาได้ แต่ผู้หลงทางยังไม่รู้ว่าตนเองกำลังกลายเป็นสิ่งใด ตอนนี้เขาถูกจดจำในฐานะผู้ผ่านประตูแรก",
  };
}

export function applyAdvancedClass(character: Character, advancedClassId: string): Character {
  const advancedClass = advancedClasses.find((item) => item.id === advancedClassId) ?? getFallbackAdvancedClass(character);
  if (advancedClass.id !== advancedClassId) return character;
  return {
    ...character,
    advancedClassId: advancedClass.id,
    advancedClassName: advancedClass.nameTh,
    classEvolutionResolved: true,
    pendingAdvancedClassChoice: false,
    hasClearedFloor10: true,
  };
}

export function applyAdvancedClassObject(character: Character, advancedClass: AdvancedClass): Character {
  return {
    ...character,
    advancedClassId: advancedClass.id,
    advancedClassName: advancedClass.nameTh,
    classEvolutionResolved: true,
    pendingAdvancedClassChoice: false,
    hasClearedFloor10: true,
  };
}

export function getAdvancedClassChanceBonus(character: Character, floor: FloorDefinition, actionId: DivineActionId, towerPressure = 0): number {
  const advancedClass = getAdvancedClass(character);
  if (!advancedClass) return 0;
  const tags = floor.tags ?? [];
  let bonus = advancedClass.effects.successBonus ?? 0;
  if (actionId === "blessing") bonus += advancedClass.effects.blessingBonus ?? 0;
  if (actionId === "silence") bonus += advancedClass.effects.silenceBonus ?? 0;
  if (floor.challengeType === "combat" || floor.challengeType === "boss" || tags.includes("combat")) bonus += advancedClass.effects.combatBonus ?? 0;
  if (floor.challengeType === "survival" || tags.includes("survival")) bonus += advancedClass.effects.survivalBonus ?? 0;
  if (floor.challengeType === "trap" || tags.includes("trap") || tags.includes("danger")) bonus += advancedClass.effects.trapBonus ?? 0;
  if (floor.challengeType === "darkness" || tags.includes("darkness")) bonus += advancedClass.effects.darknessBonus ?? 0;
  if (floor.challengeType === "puzzle" || tags.includes("puzzle") || tags.includes("mechanism")) bonus += advancedClass.effects.puzzleBonus ?? 0;
  if (floor.challengeType === "npc" || tags.includes("npc")) bonus += advancedClass.effects.npcBonus ?? 0;
  if (towerPressure >= 8) bonus += advancedClass.effects.pressureBonus ?? 0;
  if (advancedClass.id === "scrap-survivalist" && character.survival.hunger >= 60) bonus += advancedClass.effects.hungerPenaltyReduction ?? 0;
  if (
    advancedClass.id === "broken-warrior" &&
    (floor.challengeType === "combat" || floor.challengeType === "boss") &&
    character.survival.injury >= (advancedClass.effects.combatInjuryBonusThreshold ?? 40)
  ) {
    bonus += 7;
  }
  return bonus;
}

export function getAdvancedClassReason(character: Character, floor: FloorDefinition, actionId: DivineActionId, towerPressure = 0): string | undefined {
  const advancedClass = getAdvancedClass(character);
  if (!advancedClass) return undefined;
  const bonus = getAdvancedClassChanceBonus(character, floor, actionId, towerPressure);
  if (bonus <= 0) return undefined;
  return `${advancedClass.nameTh} ส่งผลต่อการอ่านสถานการณ์ของชั้นนี้`;
}

export function buildAdvancedClassWhy(advancedClass: AdvancedClass, character: Character): string {
  const affinity = normalizePathAffinity(character.pathAffinity);
  if (advancedClass.requiredPaths.length === 0) {
    return "เส้นทางเฉพาะยังไม่ชัดเจนพอ แต่การผ่านประตูแรกยังทิ้งร่องรอยไว้ในตัวเขา";
  }
  return advancedClass.requiredPaths
    .map((requirement) => `${getPathLabel(requirement.pathId)} ${affinity[requirement.pathId]}/${requirement.minimum}`)
    .join("\n");
}
