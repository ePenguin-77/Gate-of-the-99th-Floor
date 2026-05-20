import { classSkills } from "../data/classSkills";
import type { Character, ClassIdentity, ClassSkill, DivineActionId, EncounterDecisionId, EncounterTemporaryModifiers, FloorDefinition, FloorResultLevel } from "../types/game";

const contextMatches = (floor: FloorDefinition, contexts: string[]) => {
  const tags = floor.tags ?? [];
  return contexts.includes(floor.challengeType) || contexts.some((context) => tags.includes(context));
};

export const classIdentities: ClassIdentity[] = [
  {
    id: "fighter",
    nameTh: "นักสู้",
    identityTh: "คนที่เชื่อว่าทางรอดบางครั้งต้องถูกเปิดด้วยแรงปะทะ",
    preferredApproachTh: "ปะทะตรงหน้าและฝืนผ่านแรงกดดัน",
    classPassiveTh: "ชั้นต่อสู้มีโอกาสผ่าน +6% แต่เมื่อล้มเหลวรุนแรงจะบาดเจ็บเพิ่ม เพราะมักรับความเสี่ยงตรงๆ",
    encounterIntentTemplates: [
      "{name}ขยับมือไปจับอาวุธโดยไม่รู้ตัว เขาเชื่อว่าถ้าต้องผ่าน ก็ต้องผ่านด้วยการปะทะตรงๆ",
      "{name}วางน้ำหนักลงบนส้นเท้าเหมือนกำลังรอจังหวะเปิดศึก หอคอยอาจขู่เขาได้ แต่หยุดร่างกายนี้ไม่ได้ง่ายๆ",
    ],
    classAction: {
      id: "fighter-force-clash",
      nameTh: "ฝืนปะทะ",
      descriptionTh: "ใช้พละกำลังเปิดทางตรงหน้า เพิ่มโอกาสผ่าน แต่เสี่ยงบาดเจ็บ",
      successBonus: 10,
      injuryRiskModifier: 15,
      preferredContexts: ["combat", "boss", "danger", "survival"],
    },
  },
  {
    id: "guard",
    nameTh: "ผู้พิทักษ์",
    identityTh: "คนที่รอดด้วยการยืนให้นานกว่าสิ่งที่พยายามทำลายเขา",
    preferredApproachTh: "ตั้งรับ คุมความเสี่ยง และลดความเสียหาย",
    classPassiveTh: "อาการบาดเจ็บจากความล้มเหลวลดลง 15% แต่ความเหนื่อยล้าสะสมเพิ่มขึ้นเล็กน้อย",
    encounterIntentTemplates: [
      "{name}ยกแขนขึ้นป้องกันโดยไม่รู้ตัว เขาไม่ได้คิดจะชนะเร็ว แค่ต้องไม่ล้มก่อนหอคอยจะหมดแรงกด",
      "{name}ก้าวช้าแต่มั่นคง ทุกก้าวเหมือนตั้งโล่ไว้ระหว่างหัวใจกับความกลัว",
    ],
    classAction: {
      id: "guard-brace",
      nameTh: "ตั้งรับ",
      descriptionTh: "ลดความเสียหายจากความล้มเหลว เหมาะเมื่อสถานการณ์เริ่มแย่",
      successBonus: -3,
      injuryRiskModifier: -25,
      preferredContexts: ["combat", "trap", "survival", "boss"],
    },
  },
  {
    id: "scout",
    nameTh: "นักสำรวจ",
    identityTh: "คนที่เชื่อว่าทุกทางตันมีรอยฝุ่นบอกทางออก",
    preferredApproachTh: "อ่านเส้นทาง หลีกเลี่ยงกับดัก และเลือกทางที่ปลอดภัยกว่า",
    classPassiveTh: "ชั้นกับดัก ความมืด และการนำทางมีโอกาสผ่าน +6% และออกหาเสบียงเสี่ยงน้อยลง",
    encounterIntentTemplates: [
      "{name}ไม่รีบเดินต่อ สายตาของเขากวาดมองรอยเท้า รอยฝุ่น และทิศทางลมในทางเดินแคบๆ",
      "{name}ก้มลงแตะพื้นเบาๆ เขาไม่ได้มองหาทางที่ใกล้ที่สุด แต่มองหาทางที่ยังเหลือชีวิตปลายทาง",
    ],
    classAction: {
      id: "scout-read-route",
      nameTh: "อ่านเส้นทาง",
      descriptionTh: "ใช้ประสบการณ์สำรวจเพื่อหาทางที่ปลอดภัยกว่า",
      successBonus: 10,
      injuryRiskModifier: -5,
      fatigueModifier: 4,
      preferredContexts: ["trap", "darkness", "navigation", "danger"],
    },
  },
  {
    id: "hunter",
    nameTh: "นักล่า",
    identityTh: "คนที่ไม่ไล่ตามอันตราย แต่รอให้อันตรายเดินเข้าเงื้อมมือ",
    preferredApproachTh: "วางกับดัก อ่านเหยื่อ และเอาตัวรอดในพื้นที่อันตราย",
    classPassiveTh: "ชั้นต่อสู้ เอาตัวรอด และสิ่งมีชีวิตมีโอกาสผ่าน +5% และกลับชั้นเก่าอาจได้อาหารเพิ่ม",
    encounterIntentTemplates: [
      "{name}หยุดฟังเสียงรอบตัวก่อนขยับ เขาไม่ได้ถามว่าศัตรูอยู่ไหน แต่ถามว่ามันจะเดินมาทางใด",
      "{name}มองพื้นที่เหมือนลานล่า ทุกมุมมืดอาจเป็นภัย หรืออาจกลายเป็นกับดักของเขาเอง",
    ],
    classAction: {
      id: "hunter-snare",
      nameTh: "วางกับดัก",
      descriptionTh: "เตรียมกับดักหรือจุดล่อศัตรู ลดความเสี่ยงจากการปะทะ",
      successBonus: 8,
      injuryRiskModifier: -10,
      costTh: "ใช้วัสดุ: อาหาร 1 หรือทอง 5 ถ้ามี",
      preferredContexts: ["combat", "beast", "survival", "boss"],
    },
  },
  {
    id: "acolyte",
    nameTh: "ผู้ศรัทธา",
    identityTh: "คนที่ยังกล้าเชื่อว่ามีบางสิ่งได้ยินเขา แม้หอคอยจะเงียบงัน",
    preferredApproachTh: "พึ่งศรัทธา ประคองใจ และรับพรได้มีประสิทธิภาพ",
    classPassiveTh: "พรแห่งเทพแรงขึ้น +5% แต่การพึ่งพาเทพเพิ่มเร็วขึ้นเมื่อใช้พร",
    encounterIntentTemplates: [
      "{name}เงยหน้าขึ้นเล็กน้อย ราวกับกำลังรอฟังว่าฟ้ายังมองเห็นเขาอยู่หรือไม่",
      "{name}วางมือบนอกและพยายามแยกเสียงหัวใจของตนเองออกจากเสียงของหอคอย",
    ],
    classAction: {
      id: "acolyte-pray",
      nameTh: "ภาวนาก่อนก้าวต่อ",
      descriptionTh: "รวบรวมศรัทธาเพื่อให้ใจมั่นคงก่อนเผชิญหอคอย",
      successBonus: 5,
      injuryRiskModifier: 0,
      moraleModifier: 3,
      preferredContexts: ["moral", "fear", "boss", "survival"],
    },
  },
  {
    id: "scholar",
    nameTh: "นักปราชญ์",
    identityTh: "คนที่พยายามพิสูจน์ว่าความกลัวก็มีรูปแบบให้ศึกษา",
    preferredApproachTh: "วิเคราะห์กลไก ปริศนา และเหตุผลที่ซ่อนอยู่",
    classPassiveTh: "ชั้นปริศนา กลไก และตรรกะมีโอกาสผ่าน +8% แต่ชั้นต่อสู้ลดลง -3%",
    encounterIntentTemplates: [
      "{name}หรี่ตามองจังหวะของพื้นและเงา เขาเชื่อว่าหอคอยมีกฎ แม้กฎนั้นจะเกลียดมนุษย์ก็ตาม",
      "{name}พยายามจัดความกลัวให้เป็นลำดับเหตุผล ถ้าหอคอยคือปัญหา มันต้องมีเงื่อนงำให้แก้",
    ],
    classAction: {
      id: "scholar-analyze",
      nameTh: "วิเคราะห์กลไก",
      descriptionTh: "หยุดอ่านรูปแบบของชั้นนี้อย่างมีเหตุผล",
      successBonus: 12,
      injuryRiskModifier: 0,
      fatigueModifier: 5,
      preferredContexts: ["puzzle", "mechanism", "trap", "preparation"],
    },
  },
  {
    id: "tinker",
    nameTh: "ช่างประดิษฐ์",
    identityTh: "คนที่มองเศษของไร้ค่าเป็นเวลาหายใจเพิ่มอีกหนึ่งครั้ง",
    preferredApproachTh: "ดัดแปลงของ ซ่อมฉุกเฉิน และใช้ทรัพยากรให้คุ้ม",
    classPassiveTh: "อุปกรณ์เตรียมขึ้นหอคอยแรงขึ้นและราคาถูกลง 15% กับดักทำให้บาดเจ็บน้อยลงเล็กน้อย",
    encounterIntentTemplates: [
      "{name}ก้มลงมองรอยต่อของพื้นหิน เขาไม่ได้คิดจะฝ่าไปด้วยแรง แต่กำลังมองหากลไกที่อาจซ่อนอยู่ใต้ฝุ่น",
      "{name}แตะกระเป๋าเครื่องมืออย่างไม่รู้ตัว เศษโลหะ เชือก และไฟเล็กๆ อาจกลายเป็นทางรอดได้เสมอ",
    ],
    classAction: {
      id: "tinker-rig",
      nameTh: "ดัดแปลงอุปกรณ์",
      descriptionTh: "ใช้ของที่มีอยู่ซ่อมแซมหรือดัดแปลงอุปกรณ์ฉุกเฉิน",
      successBonus: 5,
      injuryRiskModifier: -12,
      costTh: "ใช้ทอง 4 ถ้ามี ไม่เช่นนั้นความเหนื่อยล้า +6",
      preferredContexts: ["trap", "mechanism", "puzzle", "danger"],
    },
  },
  {
    id: "rogue",
    nameTh: "เงาเร้น",
    identityTh: "คนที่รอดเพราะไม่ยอมอยู่ตรงที่หอคอยคาดว่าเขาจะอยู่",
    preferredApproachTh: "ลอบผ่าน เลี่ยงการปะทะ และฉวยโอกาสจากช่องว่าง",
    classPassiveTh: "ลดความเสี่ยงบาดเจ็บและเลี่ยงโทษบางส่วนจากชั้นต่อสู้ แต่รางวัลจากการปะทะตรงๆ อาจลดลง",
    encounterIntentTemplates: [
      "{name}ปล่อยให้เงาของตนเองนำไปก่อน เขาไม่ได้อยากชนะหอคอย แค่อยากผ่านไปโดยไม่ให้มันแตะตัว",
      "{name}มองหาจังหวะที่ไม่มีใครควรมองเห็น จังหวะเล็กๆ นั้นอาจพาเขารอดได้มากกว่าดาบหรือคำภาวนา",
    ],
    classAction: {
      id: "rogue-slip",
      nameTh: "ลอบผ่าน",
      descriptionTh: "พยายามผ่านสถานการณ์โดยไม่ปะทะตรงๆ",
      successBonus: 6,
      injuryRiskModifier: -20,
      preferredContexts: ["trap", "social", "danger", "npc", "darkness"],
    },
  },
];

export function getClassIdentity(classId: string): ClassIdentity {
  return classIdentities.find((identity) => identity.id === classId) ?? classIdentities[0];
}

export function getClassIntent(character: Character, floor: FloorDefinition): string {
  const identity = getClassIdentity(character.classId);
  const template = identity.encounterIntentTemplates[floor.floor % identity.encounterIntentTemplates.length] ?? identity.encounterIntentTemplates[0];
  const weakLine =
    Math.max(character.survival.hunger, character.survival.fatigue, character.survival.injury, character.survival.sickness) >= 75
      ? " แต่ร่างกายที่อ่อนล้าทำให้ความตั้งใจนั้นสั่นคลอน"
      : "";
  const memoryLine = character.memories[0] ? ` ความทรงจำเรื่อง${character.memories[0].title}ยังเกาะอยู่ในแววตาเขา` : "";
  return `${template.replaceAll("{name}", character.name)}${memoryLine}${weakLine}`;
}

export function getClassPassiveChanceBonus(character: Character, floor: FloorDefinition, actionId?: DivineActionId): number {
  let bonus = 0;
  const tags = floor.tags ?? [];
  const skills = character.skills ?? [];
  if (character.classId === "fighter" && (floor.challengeType === "combat" || floor.challengeType === "boss")) bonus += 6;
  if (character.classId === "scout" && (floor.challengeType === "trap" || floor.challengeType === "darkness" || tags.includes("navigation"))) bonus += 6;
  if (character.classId === "hunter" && (floor.challengeType === "combat" || floor.challengeType === "survival" || tags.includes("beast"))) bonus += 5;
  if (character.classId === "acolyte" && actionId === "blessing") bonus += 5;
  if (character.classId === "scholar" && (floor.challengeType === "puzzle" || tags.includes("logic") || tags.includes("mechanism"))) bonus += 8;
  if (character.classId === "scholar" && (floor.challengeType === "combat" || floor.challengeType === "boss")) bonus -= 3;
  if (character.classId === "tinker" && tags.includes("trap")) bonus += 3;
  if (character.classId === "rogue" && (floor.challengeType === "trap" || tags.includes("danger") || floor.challengeType === "npc")) bonus += 4;

  if (skills.includes("fighter-opening-tempo") && (floor.challengeType === "combat" || floor.challengeType === "boss")) bonus += 5;
  if (skills.includes("hunter-breath") && floor.challengeType === "survival") bonus += 5;
  if (skills.includes("scholar-think-before-step") && floor.challengeType === "puzzle") bonus += 5;
  if (skills.includes("scout-second-exit") && (floor.challengeType === "trap" || floor.challengeType === "darkness")) bonus += 3;
  return bonus;
}

export function getClassPassiveReason(character: Character, floor: FloorDefinition, actionId?: DivineActionId): string | undefined {
  const identity = getClassIdentity(character.classId);
  if (getClassPassiveChanceBonus(character, floor, actionId) === 0) return undefined;
  return `ความสามารถของ${identity.nameTh}ส่งผลต่อชั้นนี้: ${identity.classPassiveTh}`;
}

export function getClassActionModifier(character: Character, floor: FloorDefinition): EncounterTemporaryModifiers {
  const action = getClassIdentity(character.classId).classAction;
  const relevant = contextMatches(floor, action.preferredContexts);
  return {
    successBonus: relevant || character.classId !== "scholar" ? action.successBonus : 3,
    injuryRiskModifier: action.injuryRiskModifier,
    moraleModifier: action.moraleModifier ?? 0,
    fatigueModifier: action.fatigueModifier ?? 0,
  };
}

export function getClassActionReason(character: Character): string {
  const identity = getClassIdentity(character.classId);
  const reasons: Record<string, string> = {
    fighter: "การฝืนปะทะของนักสู้เปิดทางตรงหน้า แต่เพิ่มโอกาสบาดเจ็บ",
    guard: "การตั้งรับของผู้พิทักษ์ช่วยให้บาดเจ็บน้อยลง",
    scout: "นักสำรวจอ่านเส้นทางและเลือกจังหวะที่ปลอดภัยกว่า",
    hunter: "นักล่าวางกับดักเพื่อลดความเสี่ยงจากการปะทะ",
    acolyte: "คำภาวนาของผู้ศรัทธาช่วยประคองใจและเสริมพรแห่งเทพ",
    scholar: "นักปราชญ์วิเคราะห์รูปแบบของชั้นนี้ก่อนก้าวต่อ",
    tinker: "ความสามารถของช่างประดิษฐ์ช่วยลดความเสี่ยงจากกลไก",
    rogue: "เงาเร้นเลือกหลีกเลี่ยงการปะทะ จึงลดโอกาสบาดเจ็บ",
  };
  return reasons[identity.id] ?? `${identity.nameTh}ใช้วิธีเอาตัวรอดเฉพาะตัว`;
}

export function applyClassActionCost(character: Character, floor: FloorDefinition): { character: Character; notes: string[] } {
  const next: Character = structuredClone(character);
  const notes: string[] = [];
  if (next.classId === "hunter") {
    if (next.food > 0) {
      next.food -= 1;
      notes.push("นักล่าใช้อาหารหนึ่งส่วนเป็นเหยื่อล่อ");
    } else if (next.gold >= 5) {
      next.gold -= 5;
      notes.push("นักล่าใช้ทอง 5 เพื่อหาเศษวัสดุทำกับดัก");
    }
  }
  if (next.classId === "acolyte") {
    next.survival.morale = Math.min(100, next.survival.morale + 3);
    next.divine.dependency = Math.min(100, next.divine.dependency + 1);
    notes.push("คำภาวนาทำให้ใจมั่นคงขึ้น แต่สายสัมพันธ์กับเทพแน่นขึ้นอีกเล็กน้อย");
  }
  if (next.classId === "tinker") {
    if (next.gold >= 4) {
      next.gold -= 4;
      notes.push("ช่างประดิษฐ์ใช้ทอง 4 กับวัสดุดัดแปลงฉุกเฉิน");
    } else {
      next.survival.fatigue = Math.min(100, next.survival.fatigue + 6);
      notes.push("ช่างประดิษฐ์ไม่มีทองพอ จึงต้องใช้แรงกายดัดแปลงอุปกรณ์แทน");
    }
  }
  return { character: next, notes };
}

export function applyClassFailurePassives(character: Character, floor: FloorDefinition, level: FloorResultLevel): { character: Character; notes: string[] } {
  const next: Character = structuredClone(character);
  next.skills ??= [];
  const notes: string[] = [];
  if (character.classId === "fighter" && level === "criticalFailure") {
    next.survival.injury = Math.min(100, next.survival.injury + 5);
    notes.push("นักสู้รับความเสี่ยงตรงๆ จึงบาดเจ็บเพิ่มเมื่อพลาดหนัก");
  }
  if (character.classId === "guard" && level === "criticalFailure") {
    next.survival.injury = Math.max(0, next.survival.injury - 6);
    notes.push("ผู้พิทักษ์ลดความเสียหายจากความล้มเหลวรุนแรง");
  }
  if (character.classId === "tinker" && (floor.tags ?? []).includes("trap")) {
    next.survival.injury = Math.max(0, next.survival.injury - 4);
    notes.push("ช่างประดิษฐ์ลดบาดแผลจากกลไกของชั้นนี้");
  }
  if (character.classId === "rogue" && (floor.challengeType === "combat" || floor.challengeType === "boss")) {
    next.survival.injury = Math.max(0, next.survival.injury - 5);
    notes.push("เงาเร้นเลี่ยงแรงปะทะตรงๆ ได้บางส่วน");
  }
  if (next.skills.includes("tinker-emergency-repair") && (level === "failure" || level === "criticalFailure")) {
    next.survival.injury = Math.max(0, next.survival.injury - 3);
    notes.push("ซ่อมฉุกเฉินช่วยปิดบาดแผลเล็กน้อยหลังความล้มเหลว");
  }
  return { character: next, notes };
}

export function applyClassSuccessPassives(character: Character, floor: FloorDefinition, level: FloorResultLevel, revisit: boolean, usedClassAction: boolean): { character: Character; notes: string[] } {
  const next: Character = structuredClone(character);
  next.skills ??= [];
  const notes: string[] = [];
  const cleared = level === "greatSuccess" || level === "success" || level === "costlySuccess";
  if (!cleared) return { character: next, notes };
  if (character.classId === "hunter" && revisit && Math.random() * 100 < 45) {
    next.food += 1;
    notes.push("นักล่าพบเสบียงเพิ่มระหว่างกลับไปยังชั้นเก่า");
  }
  if (character.classId === "rogue" && usedClassAction && (floor.challengeType === "combat" || floor.challengeType === "boss")) {
    next.gold = Math.max(0, Math.floor(next.gold * 0.8));
    notes.push("เงาเร้นเลี่ยงการปะทะ จึงได้รางวัลจากชั้นนี้น้อยลง");
  }
  if (next.skills.includes("acolyte-inner-light") && character.classId === "acolyte") {
    next.survival.morale = Math.min(100, next.survival.morale + 2);
    notes.push("แสงในใจช่วยฟื้นขวัญกำลังใจหลังรับพร");
  }
  return { character: next, notes };
}

export function unlockClassSkills(character: Character, floorNumber: number): { character: Character; unlocked: ClassSkill[] } {
  const next: Character = structuredClone(character);
  next.skills ??= [];
  const unlocked: ClassSkill[] = [];
  [3, 6, 10].forEach((milestone) => {
    if (floorNumber < milestone) return;
    const available = classSkills.find((skill) => skill.classId === next.classId && skill.unlockFloor === milestone);
    if (available && !next.skills.includes(available.id)) {
      next.skills.push(available.id);
      unlocked.push(available);
    }
  });
  return { character: next, unlocked };
}
