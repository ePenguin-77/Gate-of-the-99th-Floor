import { getDominantPaths } from "./pathAffinity";
import type { Character, DivineActionId, EncounterDecisionId, EncounterMidpointOutcome, EncounterTemporaryModifiers, FloorDefinition, FloorIntel, PathId, PreparationBuff } from "../types/game";

export type Floor10Phase = "approach" | "identity" | "divine" | "trial" | "final";
export type Floor10FinalDecision = "passGate" | "retreat" | "lastBlessing" | "walkAlone" | "usePreparation" | "classAction";

const pathQuestions: Record<PathId, string> = {
  protector: "เจ้ามาถึงที่นี่ด้วยมือที่ยื่นไปหาคนอื่น แม้มือคู่นั้นจะสั่น",
  survivor: "เจ้ามาถึงที่นี่ด้วยความดื้อรั้นของคนที่ยังไม่ยอมตาย",
  seeker: "เจ้ามาถึงที่นี่ด้วยคำถามมากกว่าคำตอบ",
  faithbound: "เจ้ามาถึงที่นี่เพราะยังเชื่อว่าฟ้ามองเห็นเจ้า",
  independent: "เจ้ามาถึงที่นี่ด้วยก้าวของตนเอง แม้ไม่มีเสียงใดนำทาง",
  shadow: "เจ้ามาถึงที่นี่เพราะรู้ว่าบางครั้ง การไม่ถูกมองเห็นคือทางรอด",
  broken: "เจ้ามาถึงที่นี่พร้อมรอยแตกมากมาย แต่ยังไม่ยอมพังทลาย",
  merciful: "เจ้ามาถึงที่นี่เพราะยังเลือกเมตตาในโลกที่ไม่มีเหตุผลให้ทำเช่นนั้น",
};

const zeroModifier: EncounterTemporaryModifiers = {
  successBonus: 0,
  injuryRiskModifier: 0,
  moraleModifier: 0,
  fatigueModifier: 0,
};

export function getFloor10ConditionWarnings(character: Character): string[] {
  const warnings: string[] = [];
  if (character.survival.hunger >= 70) warnings.push("ความหิวทำให้เขากลืนน้ำลายอย่างยากลำบาก ราวกับประตูรู้ว่าเขาอ่อนแอแค่ไหน");
  if (character.survival.fatigue >= 70) warnings.push("ขาของเขาหนักจนเหมือนมีโซ่ล่ามไว้กับพื้น แต่ประตูไม่ได้ขยับเข้ามาหาใคร");
  if (character.survival.injury >= 50) warnings.push("บาดแผลที่ยังไม่หายเริ่มปวดขึ้นพร้อมกัน ราวกับหอคอยกำลังนับรอยแตกบนร่างกาย");
  if (character.survival.sickness >= 50) warnings.push("ลมหายใจของเขาร้อนและสั้น หอคอยไม่ต้องโจมตี คนป่วยก็พ่ายแพ้ต่อประตูได้");
  return warnings;
}

export function getFloor10DominantIdentity(character: Character) {
  const paths = getDominantPaths(character, 2).filter((path) => path.value > 0);
  return {
    paths,
    lines: paths.length > 0 ? paths.map((path) => pathQuestions[path.pathId]) : ["เจ้ามาถึงที่นี่โดยยังไม่รู้ว่าตนเองกลายเป็นอะไร แต่ประตูก็ได้ยินเสียงฝีเท้าของเจ้าแล้ว"],
  };
}

export function getFloor10Trial(character: Character): EncounterMidpointOutcome {
  const dominant = getDominantPaths(character, 1)[0]?.pathId ?? "survivor";
  const trials: Record<PathId, Omit<EncounterMidpointOutcome, "modifier"> & { modifier: EncounterTemporaryModifiers }> = {
    protector: {
      id: "floor10-protector",
      title: "ภาพลวงของมือที่ขอความช่วยเหลือ",
      narrative: "ผู้เฝ้าประตูสร้างเงาของใครบางคนที่กำลังจะตกลงไปในความมืด เขารู้ว่านั่นอาจไม่ใช่คนจริง แต่หัวใจยังสั่งให้ก้าวไปหา",
      tags: ["protector", "merciful", "illusion"],
      modifier: { successBonus: pathScore(character, "protector", 2), injuryRiskModifier: 8, moraleModifier: 0, fatigueModifier: 4 },
    },
    survivor: {
      id: "floor10-survivor",
      title: "พื้นหินที่เลือกความเจ็บปวดแทนการถอย",
      narrative: "พื้นใต้เท้าทรุดลงทีละแผ่น ทางรอดมีอยู่จริง แต่ทุกก้าวบังคับให้เขาเลือกว่าจะเจ็บตรงไหนก่อน",
      tags: ["survivor", "endurance", "collapse"],
      modifier: { successBonus: pathScore(character, "survivor", 2), injuryRiskModifier: 6, moraleModifier: 0, fatigueModifier: 5 },
    },
    seeker: {
      id: "floor10-seeker",
      title: "กฎปลอมใต้สัญลักษณ์ที่ขัดแย้ง",
      narrative: "ประตูสลักกฎสิบสามข้อที่หักล้างกันเอง ผู้เฝ้าประตูไม่ทดสอบว่าเขาอ่านออกหรือไม่ แต่ว่าเขากล้าสงสัยสิ่งที่อ่านหรือเปล่า",
      tags: ["seeker", "false-rule", "puzzle"],
      modifier: { successBonus: pathScore(character, "seeker", 2), injuryRiskModifier: 0, moraleModifier: 0, fatigueModifier: 2 },
    },
    faithbound: {
      id: "floor10-faithbound",
      title: "เสียงเทพที่ถูกบิดจนจำแทบไม่ได้",
      narrative: "เสียงจากฟ้ากลายเป็นหลายเสียงซ้อนกัน บางเสียงเหมือนคำเตือน บางเสียงเหมือนคำสั่ง และบางเสียงเหมือนประตูหัวเราะ",
      tags: ["faithbound", "dependency", "distorted-divine"],
      modifier: { successBonus: pathScore(character, "faithbound", 2) - (character.divine.dependency >= 60 ? 5 : 0), injuryRiskModifier: 2, moraleModifier: -1, fatigueModifier: 0 },
    },
    independent: {
      id: "floor10-independent",
      title: "ช่วงเวลาที่ฟ้าเงียบสนิท",
      narrative: "ผู้เฝ้าประตูปิดกั้นเสียงจากเบื้องบนชั่วครู่ เหลือเพียงลมหายใจของเขาเองและคำถามว่าเท้าคู่นี้ยังจำทางของตนได้หรือไม่",
      tags: ["independent", "silence", "willpower"],
      modifier: { successBonus: pathScore(character, "independent", 2), injuryRiskModifier: 0, moraleModifier: 1, fatigueModifier: 0 },
    },
    shadow: {
      id: "floor10-shadow",
      title: "รอยแยกที่ไม่มีใครควรเห็น",
      narrative: "ด้านข้างประตูมีรอยแยกบางๆ ที่อาจเลี่ยงผู้เฝ้าประตูได้ แต่ทางนั้นไม่ให้เกียรติ ไม่ให้รางวัล และไม่รับรองว่าจะพากลับมา",
      tags: ["shadow", "hidden-route", "ambush"],
      modifier: { successBonus: pathScore(character, "shadow", 2), injuryRiskModifier: -4, moraleModifier: 0, fatigueModifier: 3 },
    },
    broken: {
      id: "floor10-broken",
      title: "ความทรงจำที่ถูกบังคับให้หายใจอีกครั้ง",
      narrative: "ผู้เฝ้าประตูไม่ยกอาวุธ มันเพียงเปิดบาดแผลเก่าทีละแผล และถามว่าเขายังเหลืออะไรให้ปกป้องตัวเองจากอดีต",
      tags: ["broken", "memory", "trauma"],
      modifier: { successBonus: pathScore(character, "broken", 2), injuryRiskModifier: 0, moraleModifier: -4, fatigueModifier: 0 },
    },
    merciful: {
      id: "floor10-merciful",
      title: "ศัตรูที่คุกเข่าอยู่หน้าประตู",
      narrative: "เงาของศัตรูคนหนึ่งทิ้งอาวุธลงและขอไม่ให้เขาฆ่า หอคอยตั้งคำถามว่าความเมตตายังมีที่อยู่หน้าประตูซึ่งไม่เคยเมตตาใครหรือไม่",
      tags: ["merciful", "mercy", "choice"],
      modifier: { successBonus: pathScore(character, "merciful", 2), injuryRiskModifier: 5, moraleModifier: 2, fatigueModifier: 0 },
    },
  };
  return trials[dominant];
}

export function getFloor10DivineComment(actionId: DivineActionId, character: Character): string {
  if (actionId === "whisper" && character.divine.dependency >= 60) return "เสียงกระซิบไปถึงเขา แต่เขาชะงักราวกับกลัวว่าคำต่อไปจะกลายเป็นโซ่";
  if (actionId === "omen") return "ลางบอกเหตุแหวกภาพลวงบางส่วนออก เผยให้เห็นว่าเส้นทางที่ปลอดภัยที่สุดอาจเป็นเส้นทางที่น่ากลัวที่สุด";
  if (actionId === "blessing" && character.divine.dependency >= 50) return "ผู้เฝ้าประตูเอ่ยช้าๆ ว่า เจ้าก้าวมาถึงที่นี่ด้วยขาของตนเอง หรือด้วยมือของเทพ?";
  if (actionId === "blessing") return "พรแห่งเทพสว่างขึ้นหน้าประตู แต่แสงนั้นทำให้เงาของเขายาวขึ้นเช่นกัน";
  if (actionId === "silence") return "เทพเลือกที่จะเงียบ และความเงียบนั้นดังกว่าคำสั่งใดที่เคยมีมา";
  return "เสียงกระซิบพยายามเรียงความคิดให้เขา แต่ผู้เฝ้าประตูฟังเสียงนั้นอยู่ด้วย";
}

export function createFloor10FinalMidpoint(
  trial: EncounterMidpointOutcome,
  finalDecision: Floor10FinalDecision,
  actionId: DivineActionId,
  character: Character,
  preparationBuff?: PreparationBuff,
  floorIntel?: FloorIntel,
): EncounterMidpointOutcome {
  const modifier = { ...trial.modifier };
  if (finalDecision === "passGate") modifier.successBonus += 2;
  if (finalDecision === "lastBlessing") {
    modifier.successBonus += character.divine.faith >= 25 ? 12 : 6;
    modifier.injuryRiskModifier += 2;
  }
  if (finalDecision === "walkAlone") {
    modifier.successBonus += actionId === "silence" ? 5 : 0;
    modifier.moraleModifier += 1;
  }
  if (finalDecision === "usePreparation") {
    modifier.successBonus += (preparationBuff ? 6 : 0) + (floorIntel ? (floorIntel.isFalse ? -4 : 5) : 0);
    modifier.injuryRiskModifier -= preparationBuff ? 6 : 0;
  }
  return {
    ...trial,
    id: `${trial.id}-${finalDecision}`,
    modifier,
  };
}

export function mapFloor10Decision(finalDecision: Floor10FinalDecision): EncounterDecisionId {
  if (finalDecision === "classAction") return "classAction";
  if (finalDecision === "walkAlone") return "self";
  if (finalDecision === "usePreparation") return "resource";
  return "continue";
}

export function mapFloor10Action(finalDecision: Floor10FinalDecision, selectedAction: DivineActionId): DivineActionId {
  if (finalDecision === "lastBlessing") return "blessing";
  if (finalDecision === "walkAlone") return "silence";
  return selectedAction;
}

export function getFloor10DecisionText(finalDecision: Floor10FinalDecision): string {
  const text: Record<Floor10FinalDecision, string> = {
    passGate: "เขาเลือกเดินผ่านประตูด้วยทุกสิ่งที่เหลืออยู่",
    retreat: "เขาเลือกถอยกลับจากประตูแรก ทั้งที่รู้ว่าหอคอยจะจำความลังเลนี้ไว้",
    lastBlessing: "เขาขอพรครั้งสุดท้ายก่อนประตูจะตัดสินว่าเขาคู่ควรหรือไม่",
    walkAlone: "เทพไม่ผลัก ไม่เตือน ไม่สั่ง เขาต้องเดินเอง",
    usePreparation: "สิ่งที่เตรียมไว้ถูกหยิบขึ้นมาในจังหวะที่ประตูเริ่มปิดทางเลือก",
    classAction: "เขาเลือกตอบประตูด้วยวิธีเอาตัวรอดที่ติดมากับตัวตนของตนเอง",
  };
  return text[finalDecision];
}

export function getFloor10PreparationAvailable(preparationBuff?: PreparationBuff, floorIntel?: FloorIntel): boolean {
  return Boolean(preparationBuff || floorIntel);
}

export function getFloor10FinalDecisionOptions(character: Character, preparationBuff?: PreparationBuff, floorIntel?: FloorIntel) {
  return [
    { id: "passGate" as const, label: "เดินผ่านประตู", description: "ผลักทุกสิ่งที่มีอยู่เข้าสู่จังหวะสุดท้าย", enabled: true },
    { id: "retreat" as const, label: "ถอยกลับเมือง", description: "ไม่ผ่านชั้นนี้ แต่ลดโอกาสเสียหายหนักที่สุด", enabled: true },
    { id: "lastBlessing" as const, label: "ขอพรครั้งสุดท้าย", description: "ใช้ศรัทธาเรียกแรงผลักสุดท้าย แต่การพึ่งพาเทพจะเพิ่มขึ้น", enabled: character.divine.faith >= 15 },
    { id: "walkAlone" as const, label: "ให้เขาเดินเอง", description: "ไม่มีโบนัสตรงๆ แต่ถ้าสำเร็จ ตัวตนของเขาจะยืนชัดขึ้น", enabled: true },
    { id: "usePreparation" as const, label: "ใช้สิ่งที่เตรียมไว้", description: "ใช้ข้อมูลหรืออุปกรณ์ที่เตรียมมาก่อนขึ้นหอคอย", enabled: getFloor10PreparationAvailable(preparationBuff, floorIntel) },
    { id: "classAction" as const, label: "ใช้วิธีของคลาส", description: "ให้ผู้หลงทางตอบบททดสอบด้วยสัญชาตญาณและวิธีเอาตัวรอดของคลาสตนเอง", enabled: true },
  ];
}

export function getFloor10ResultPrelude(): string {
  return "ประตูแรกเปิดออก แต่สิ่งที่รออยู่อีกฝั่งไม่ใช่ชั้นถัดไป มันคือเงาของตัวตนที่เขาค่อยๆ กลายเป็นมาตลอดสิบชั้นแรก";
}

function pathScore(character: Character, pathId: PathId, divisor: number): number {
  return Math.min(8, Math.floor((character.pathAffinity?.[pathId] ?? 0) / divisor));
}
