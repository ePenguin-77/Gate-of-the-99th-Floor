import { getClassIntent } from "./classIdentity";
import type {
  Character,
  DivineActionId,
  EncounterDecisionId,
  EncounterMidpointOutcome,
  EncounterState,
  EncounterTemporaryModifiers,
  FloorDefinition,
} from "../types/game";

const emptyModifier: EncounterTemporaryModifiers = {
  successBonus: 0,
  injuryRiskModifier: 0,
  moraleModifier: 0,
  fatigueModifier: 0,
};

const addModifiers = (...modifiers: EncounterTemporaryModifiers[]): EncounterTemporaryModifiers =>
  modifiers.reduce(
    (total, modifier) => ({
      successBonus: total.successBonus + modifier.successBonus,
      injuryRiskModifier: total.injuryRiskModifier + modifier.injuryRiskModifier,
      moraleModifier: total.moraleModifier + modifier.moraleModifier,
      fatigueModifier: total.fatigueModifier + modifier.fatigueModifier,
    }),
    { ...emptyModifier },
  );

export function createEncounterState(floor: FloorDefinition, riskLevel: string): EncounterState {
  return {
    floorNumber: floor.floor,
    phase: "entrance",
    riskLevel,
    temporaryModifiers: { ...emptyModifier },
    narrativeFlags: [],
    canRetreat: true,
    canPushRisk: true,
  };
}

export function getCharacterIntent(character: Character, floor: FloorDefinition): string {
  return getClassIntent(character, floor);
}

export function getFloorMidpoint(floor: FloorDefinition, character: Character, divineAction: DivineActionId, towerPressure: number): EncounterMidpointOutcome {
  const pressurePenalty = towerPressure >= 13 ? -8 : towerPressure >= 8 ? -5 : 0;
  const actionBonus = divineAction === "omen" && ((floor.tags ?? []).includes("trap") || (floor.tags ?? []).includes("darkness")) ? 4 : 0;
  const conditionPenalty =
    character.survival.fatigue >= 75 || character.survival.hunger >= 75 || character.survival.injury >= 70 || character.survival.sickness >= 70 ? -5 : 0;
  const successBonus = pressurePenalty + actionBonus + conditionPenalty;
  const pressureLine =
    towerPressure >= 13
      ? "หอคอยเงียบเกินไป ราวกับมันไม่ได้รอให้เขาขึ้นไป แต่รอให้เขาพลาด"
      : towerPressure >= 8
        ? "ความเงียบรอบตัวหนาขึ้นผิดปกติ เหมือนชั้นนี้กำลังฟังเสียงหายใจของเขา"
        : "";

  const floorSpecific: Record<number, Omit<EncounterMidpointOutcome, "modifier">> = {
    1: {
      id: "cracked-stone",
      title: "พื้นหินเริ่มสั่น",
      narrative: `พื้นหินใต้เท้าเริ่มสั่น รอยแยกเล็กๆ เปิดออกตรงหน้า ${pressureLine}`.trim(),
      tags: ["survival", "fear"],
    },
    2: {
      id: "cold-passage",
      title: "เสียงฝีเท้าในความมืด",
      narrative: `เสียงฝีเท้าดังขึ้นจากด้านหลัง แต่ด้านหน้ามีลมเย็นพัดจากช่องแคบ ${pressureLine}`.trim(),
      tags: ["darkness", "fear"],
    },
    3: {
      id: "warm-plate",
      title: "จานที่ยังอุ่นอยู่",
      narrative: `โต๊ะอาหารว่างเปล่า แต่มีจานหนึ่งใบที่ยังอุ่นอยู่ กลิ่นของมันทำให้ท้องของ${character.name}บิดเกร็งอย่างน่ากลัว`,
      tags: ["hunger", "temptation"],
    },
    4: {
      id: "breathing-wall",
      title: "กำแพงที่หายใจ",
      narrative: `กำแพงด้านซ้ายขยับเหมือนมีบางอย่างหายใจอยู่ข้างใน ${pressureLine}`.trim(),
      tags: ["trap", "danger"],
    },
    5: {
      id: "cracking-bridge",
      title: "เสียงร้องอีกฝั่งสะพาน",
      narrative: `อีกฝั่งของสะพานมีเสียงร้องขอความช่วยเหลือ แต่สะพานเริ่มแตกร้าวใต้เท้าของเขา`,
      tags: ["choice", "npc", "morale"],
    },
  };

  floorSpecific[11] = {
    id: "dust-market-stall",
    title: "แผงขายของที่ยังรอเงินทอน",
    narrative: `แผงขายของหนึ่งมีเสบียงและเครื่องมือวางอยู่ครบถ้วน แต่ถ้วยรับเหรียญข้างๆ สั่นเบาๆ เหมือนยังรอให้ใครจ่ายราคา ${pressureLine}`.trim(),
    tags: ["market", "resource", "risk"],
  };
  floorSpecific[12] = {
    id: "listening-floorboard",
    title: "พื้นไม้ที่ฟังเสียงเท้า",
    narrative: `พื้นไม้ตรงหน้ามีรอยตะปูเรียงเป็นจังหวะประหลาด ทุกครั้งที่เขาขยับ เสียงสะท้อนด้านหลังก็ขยับตามเร็วกว่าเดิม ${pressureLine}`.trim(),
    tags: ["trap", "stealth", "darkness"],
  };
  floorSpecific[13] = {
    id: "shadowless-greeting",
    title: "คำทักทายจากคนไร้เงา",
    narrative: "คนไร้เงาคนหนึ่งยิ้มให้และเรียกชื่อเขาถูกต้อง ทั้งที่ไม่มีใครในจัตุรัสควรรู้ว่าเขาเป็นใคร",
    tags: ["identity", "npc", "anomaly"],
  };
  floorSpecific[14] = {
    id: "book-that-answers-first",
    title: "หนังสือที่ตอบก่อนถูกถาม",
    narrative: `หนังสือเล่มหนึ่งเปิดเองตรงหน้ากระดาษที่เขียนคำตอบไว้แล้ว ปัญหาคือเขายังไม่ได้ถามคำถามนั้น ${pressureLine}`.trim(),
    tags: ["puzzle", "intel", "false_rule"],
  };
  floorSpecific[15] = {
    id: "clock-heartbeat",
    title: "เข็มนาฬิกาที่เดินตามหัวใจ",
    narrative: "นาฬิกาบานใหญ่เริ่มเดินตามจังหวะหัวใจของเขา ถ้าเขารีบเกินไป เข็มจะเร่ง ถ้าเขาช้าเกินไป เข็มจะหยุด",
    tags: ["time", "fatigue", "pressure"],
  };

  const generic = {
    id: "tower-shift",
    title: "หอคอยเปลี่ยนจังหวะ",
    narrative: `${floor.pressureFlavorTh ?? "เส้นทางข้างหน้าบิดเบี้ยวไปเล็กน้อย"} ${pressureLine}`.trim(),
    tags: floor.tags ?? [floor.challengeType],
  };

  const base = floorSpecific[floor.floor] ?? generic;
  return {
    ...base,
    modifier: addModifiers(emptyModifier, {
      successBonus,
      injuryRiskModifier: towerPressure >= 8 ? 5 : 0,
      moraleModifier: pressurePenalty < 0 ? -2 : 0,
      fatigueModifier: conditionPenalty < 0 ? 4 : 0,
    }),
  };
}

export function getDecisionChoices(character: Character, floorIntelAvailable: boolean, preparationAvailable: boolean, itemAvailable = false) {
  return [
    {
      id: "continue" as EncounterDecisionId,
      label: "เดินหน้าต่อ",
      description: "พยายามผ่านเหตุการณ์ตามแผนเดิม",
      detail: "ไม่มีโบนัสเพิ่ม แต่ความเสี่ยงไม่รุนแรงขึ้น",
      enabled: true,
    },
    {
      id: "retreat" as EncounterDecisionId,
      label: "ถอยกลับเมือง",
      description: "ไม่ผ่านชั้นนี้ แต่ลดความเสี่ยงที่จะบาดเจ็บหนัก",
      detail: "ความเหนื่อยล้า +8 / ขวัญกำลังใจ -2 / ความกดดันของหอคอย +1",
      enabled: true,
    },
    {
      id: "push" as EncounterDecisionId,
      label: "ฝืนเสี่ยง",
      description: "เพิ่มโอกาสผ่าน แต่ถ้าล้มเหลวจะเจ็บหนักกว่าเดิม",
      detail: "โอกาสผ่าน +10% / ความเสี่ยงบาดเจ็บ +15%",
      enabled: true,
    },
    {
      id: "resource" as EncounterDecisionId,
      label: "ใช้ไอเทมหรือทรัพยากร",
      description: "ใช้ของที่พกมาเพื่อเปลี่ยนจังหวะช่วงสุดท้าย",
      detail: itemAvailable ? "ใช้ของที่พกขึ้นหอคอย เช่น อาหาร ผ้าพันแผล ตะเกียง หรือเชือก" : floorIntelAvailable || preparationAvailable ? "เสริมผลจากข้อมูลหรืออุปกรณ์ที่เตรียมไว้" : "ใช้อาหารหรือทองเล็กน้อยเพื่อประคองร่างกาย",
      enabled: itemAvailable || character.food > 0 || character.gold >= 5 || floorIntelAvailable || preparationAvailable,
    },
    {
      id: "self" as EncounterDecisionId,
      label: "ให้ผู้หลงทางตัดสินใจเอง",
      description: "ไม่แทรกแซงช่วงสุดท้าย ปล่อยให้เขาเลือกทางของตน",
      detail: "หากสำเร็จ การยืนหยัดด้วยตนเอง +2 / หากล้มเหลว ขวัญกำลังใจ -3",
      enabled: true,
    },
  ];
}

export function describeDecision(decision: EncounterDecisionId): string {
  const descriptions: Record<EncounterDecisionId, string> = {
    continue: "เขาเดินหน้าต่อโดยยึดแผนเดิม แม้หอคอยจะเริ่มเปลี่ยนจังหวะ",
    retreat: "เขาเลือกถอยกลับ แม้จะรู้ว่าหอคอยจะกดดันมากขึ้น แต่นั่นอาจเป็นเหตุผลที่เขายังมีชีวิตอยู่",
    push: "เขาฝืนเดินหน้าต่อ และร่างกายต้องยอมรับราคาของการตัดสินใจนั้น",
    resource: "เขาหยิบสิ่งที่เตรียมไว้มาใช้ในช่วงที่หอคอยบีบให้ทุกทางเลือกแคบลง",
    self: "เทพไม่ได้เอ่ยคำใด และเขาต้องตัดสินใจเองท่ามกลางเสียงหายใจของหอคอย",
    classAction: "เขาเลือกใช้วิธีเอาตัวรอดที่ติดมากับตัวตนของเขาเอง",
  };
  return descriptions[decision];
}
