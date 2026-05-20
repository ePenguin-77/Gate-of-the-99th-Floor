import { getAdvancedClass } from "./advancedClassSystem";
import { getAdvancedClassProfile, type AdvancedClassArchetype, type AdvancedClassProfile } from "../data/advancedClassProfiles";
import { getItem } from "./inventorySystem";
import { getDominantPaths, getPathLabel } from "./pathAffinity";
import type { Character, DivineActionId, EncounterDecisionId, EncounterMidpointOutcome, EncounterTemporaryModifiers, FloorIntel, PathId, PreparationBuff } from "../types/game";

export type Floor20Phase = "registry" | "name" | "divine" | "trial" | "decision";
export type Floor20Decision = "acceptRecord" | "rewriteRecord" | "godWrites" | "tearPage" | "usePreparation" | "profileChoice" | "placeKey" | "placeMask";

const pathLines: Record<PathId, string> = {
  protector: "สมุดไม่ได้เขียนเพียงชื่อของเขา แต่มันเขียนชื่อของคนที่เขาเคยพยายามปกป้องไว้ข้างๆ",
  survivor: "ตัวอักษรเหมือนถูกขูดซ้ำหลายครั้ง ราวกับหอคอยพยายามลบชื่อเขาแล้วล้มเหลว",
  seeker: "ชื่อของเขาถูกเขียนด้วยหมึกที่เปลี่ยนรูปทุกครั้งที่พยายามอ่าน",
  faithbound: "บางช่วงของชื่อสว่างขึ้นราวกับมีแสงจากที่สูงแตะอยู่",
  independent: "ชื่อของเขาเขียนด้วยลายมือที่ไม่เหมือนของหอคอย",
  shadow: "ชื่อของเขาบางจุดแทบมองไม่เห็น เหมือนตั้งใจหลบสายตาของผู้บันทึก",
  broken: "ตัวอักษรแตกเป็นรอยร้าว แต่ยังเรียงกันเป็นชื่อเดิม",
  merciful: "มีชื่ออื่นๆ เขียนเบาๆ อยู่ใต้ชื่อของเขา ราวกับคนที่เขาไม่ยอมทอดทิ้งยังตามมาถึงที่นี่",
};

export function getFloor20ConditionLines(character: Character): string[] {
  const lines: string[] = [];
  if (character.survival.hunger >= 70) lines.push("ความหิวทำให้มือของเขาสั่นเมื่อแตะขอบสมุดทะเบียน");
  if (character.survival.fatigue >= 70) lines.push("ความเหนื่อยล้าทำให้บรรทัดในสมุดเหมือนขยับหนีสายตา");
  if (character.survival.injury >= 50) lines.push("หยดเลือดจากบาดแผลตกลงใกล้ชื่อของเขา ก่อนหมึกจะค่อยๆ ดูดมันเข้าไป");
  if (character.survival.sickness >= 50) lines.push("ลมหายใจร้อนและขุ่นจนเกิดฝ้าบางๆ บนชื่อที่ถูกเขียนไว้แล้ว");
  return lines;
}

export function getFloor20NameVerification(character: Character): { title: string; lines: string[] } {
  const dominant = getDominantPaths(character, 2).filter((path) => path.value > 0);
  return {
    title: `ชื่อของ ${character.name} ยังเป็นของเขาอยู่หรือไม่?`,
    lines:
      dominant.length > 0
        ? dominant.map((path) => pathLines[path.pathId])
        : ["ชื่อของเขายังอ่านออก แต่ช่องว่างหลังชื่อนั้นกว้างพอให้หอคอยเขียนอะไรก็ได้ลงไป"],
  };
}

export function getFloor20Trial(character: Character): EncounterMidpointOutcome {
  const advancedClass = getAdvancedClass(character);
  const profile = getAdvancedClassProfile(character.advancedClassId);
  const dominant = getDominantPaths(character, 1)[0]?.pathId ?? "survivor";
  const base: EncounterTemporaryModifiers = { successBonus: 0, injuryRiskModifier: 0, moraleModifier: 0, fatigueModifier: 0 };
  const byPath = (pathId: PathId) => Math.min(9, Math.floor((character.pathAffinity?.[pathId] ?? 0) / 3));
  const id = advancedClass?.id ?? "";

  if (profile) {
    return trial(
      `floor20-profile-${profile.advancedClassId}`,
      getProfileTrialTitle(profile),
      profile.floor20TrialTextTh,
      getProfileTrialModifier(profile, character, byPath),
      [profile.archetype, ...profile.strongTags, "record"],
    );
  }

  if (id === "blessed-vessel") {
    return trial("floor20-blessed", "ชื่อที่เป็นของเทพหรือของตนเอง", "นายทะเบียนถามว่าชื่อบนสมุดเป็นของผู้หลงทาง หรือเป็นของมือที่คอยมอบพรจากเบื้องบน", { ...base, successBonus: 8 + byPath("faithbound"), moraleModifier: character.divine.dependency >= 60 ? -4 : 0 }, ["faithbound", "blessing"]);
  }
  if (id === "kneeless-faithful") {
    return trial("floor20-kneeless", "ศรัทธาที่ไม่คุกเข่า", "เสียงจากเบื้องบนเงียบลง แต่เท้าของเขายังขยับได้ นายทะเบียนจึงต้องอ่านชื่อที่ไม่ยอมคุกเข่า", { ...base, successBonus: 7 + byPath("independent"), injuryRiskModifier: -2 }, ["faithbound", "independent", "silence"]);
  }
  if (["tower-decoder", "distorted-truth-archivist", "heretic-theorist", "careful-thinker"].includes(id)) {
    return trial("floor20-seeker", "กฎปลอมในขอบกระดาษ", "สมุดทะเบียนเขียนกฎใหม่ลงตรงขอบหน้า บางข้อขัดแย้งกันเอง และบางข้อพยายามทำให้ชื่อของเขาอ่านผิด", { ...base, successBonus: 9 + byPath("seeker"), fatigueModifier: 3 }, ["seeker", "false_rule"]);
  }
  if (["scrap-survivalist", "god-etched-artisan", "black-market-engineer", "wound-stitcher"].includes(id)) {
    return trial("floor20-tinker", "เศษของที่ยังพอใช้เขียนชะตา", "ห้องทะเบียนโยนเศษกระดาษ เครื่องมือหัก และหมึกแห้งไว้ตรงหน้า ราวกับถามว่าเขาจะประกอบตัวตนจากของเหลือได้หรือไม่", { ...base, successBonus: 8 + byPath("survivor"), injuryRiskModifier: -4 }, ["resource", "craft"]);
  }
  if (["tower-shadow", "shadow-walker", "unseen-survivor", "false-truth-seller"].includes(id)) {
    return trial("floor20-shadow", "ชื่อที่ถูกลบให้ผ่านไป", "เขาพบว่าหากขูดบางส่วนของชื่อตนเองออก อาจผ่านนายทะเบียนไปได้โดยไม่ถูกบันทึกครบถ้วน", { ...base, successBonus: 8 + byPath("shadow"), moraleModifier: -2, injuryRiskModifier: -5 }, ["shadow", "identity"]);
  }
  if (id === "broken-warrior" || dominant === "broken") {
    return trial("floor20-broken", "บาดแผลที่ถูกนับเป็นตัวอักษร", "นายทะเบียนไม่ได้มองอาวุธ แต่มองรอยแผลทุกตำแหน่งราวกับมันเป็นหลักฐานว่าเขายังเป็นคนเดิม", { ...base, successBonus: 6 + byPath("broken"), moraleModifier: -4, injuryRiskModifier: 5 }, ["broken", "injury"]);
  }
  if (["shelter-shield", "gate-knight", "wound-bearer"].includes(id) || dominant === "protector") {
    return trial("floor20-protector", "ชื่อของผู้ที่เคยถูกปกป้อง", "ข้างชื่อของเขามีชื่ออื่นค่อยๆ ปรากฏขึ้น นายทะเบียนถามว่าเขาแบกชื่อเหล่านั้นมาถึงที่นี่ได้อย่างไร", { ...base, successBonus: 7 + byPath("protector"), moraleModifier: 2, fatigueModifier: 3 }, ["protector", "npc"]);
  }
  return trial("floor20-path", `บททดสอบของ${getPathLabel(dominant)}`, "สมุดทะเบียนไม่ได้ถามว่าเขาอยากเป็นใคร แต่มันถามว่าทางที่ผ่านมาได้เขียนคำตอบนั้นไว้แล้วหรือยัง", { ...base, successBonus: 5 + byPath(dominant), injuryRiskModifier: 4 }, [dominant, "record"]);
}

export function getFloor20DecisionOptions(character: Character, preparationBuff?: PreparationBuff, floorIntel?: FloorIntel) {
  const profile = getAdvancedClassProfile(character.advancedClassId);
  const hasPreparation = Boolean(preparationBuff || floorIntel || character.equippedItems?.length);
  const hasKey = character.inventory?.some((entry) => entry.itemId === "key_without_keyhole" && entry.quantity > 0) || character.equippedItems?.includes("key_without_keyhole");
  const hasMask = character.inventory?.some((entry) => entry.itemId === "gatekeeper_mask_shard" && entry.quantity > 0) || character.equippedItems?.includes("gatekeeper_mask_shard");
  return [
    { id: "acceptRecord" as const, label: "ยอมให้หอคอยบันทึกชื่อ", description: "ยอมรับว่าสิ่งที่ผ่านมาหล่อหลอมเขาแล้ว", enabled: true },
    { id: "rewriteRecord" as const, label: "แก้ไขบันทึกด้วยตนเอง", description: "เสี่ยงกว่า แต่เปิดทางให้เขายืนกับชื่อของตนเองมากขึ้น", enabled: true },
    { id: "godWrites" as const, label: "ขอให้เทพเขียนแทน", description: "ใช้ศรัทธาช่วยผลักชื่อให้ผ่าน แต่การพึ่งพาเทพจะชัดขึ้น", enabled: character.divine.faith >= 12 },
    { id: "tearPage" as const, label: "ฉีกหน้านั้นออก", description: "ปฏิเสธบันทึกของหอคอยอย่างรุนแรง เสี่ยงมากแต่หากสำเร็จจะลดแรงกดดันได้", enabled: true },
    { id: "usePreparation" as const, label: "ใช้สิ่งที่เตรียมไว้", description: "ใช้ข้อมูล อุปกรณ์ หรือสิ่งที่พกมาเปลี่ยนบรรทัดบนสมุด", enabled: hasPreparation },
    ...(profile ? [{ id: "profileChoice" as const, label: profile.floor20SpecialChoiceTh, description: "ใช้ตัวตนของคลาสขั้นสองตอบคำถามของนายทะเบียนโดยตรง", enabled: true }] : []),
    { id: "placeKey" as const, label: "วางกุญแจบนหน้าสมุด", description: "กุญแจที่ไม่มีรูอาจเปิดบันทึกที่ไม่ควรถูกเปิด", enabled: Boolean(hasKey) },
    { id: "placeMask" as const, label: "วางเศษหน้ากากผู้เฝ้าประตูข้างชื่อ", description: "ให้ร่องรอยจากประตูแรกเป็นพยาน แต่มันอาจทำให้หอคอยจับตามองมากขึ้น", enabled: Boolean(hasMask) },
  ];
}

export function createFloor20Midpoint(trial: EncounterMidpointOutcome, decision: Floor20Decision, actionId: DivineActionId, character: Character, preparationBuff?: PreparationBuff, floorIntel?: FloorIntel): EncounterMidpointOutcome {
  const modifier = { ...trial.modifier };
  if (decision === "acceptRecord") modifier.successBonus += 2;
  if (decision === "rewriteRecord") {
    modifier.successBonus += 8;
    modifier.injuryRiskModifier += 8;
    modifier.moraleModifier += actionId === "silence" ? 1 : 0;
  }
  if (decision === "godWrites") {
    modifier.successBonus += character.divine.faith >= 35 ? 14 : 8;
    modifier.moraleModifier += 1;
  }
  if (decision === "tearPage") {
    modifier.successBonus += 12;
    modifier.injuryRiskModifier += 22;
    modifier.moraleModifier -= 4;
  }
  if (decision === "usePreparation") {
    modifier.successBonus += (preparationBuff ? 7 : 0) + (floorIntel ? (floorIntel.isFalse ? -5 : 6) : 0);
    modifier.injuryRiskModifier -= preparationBuff ? 8 : 0;
  }
  if (decision === "profileChoice") {
    const profile = getAdvancedClassProfile(character.advancedClassId);
    if (profile) {
      const profileModifier = getProfileDecisionModifier(profile);
      modifier.successBonus += profileModifier.successBonus;
      modifier.injuryRiskModifier += profileModifier.injuryRiskModifier;
      modifier.moraleModifier += profileModifier.moraleModifier;
      modifier.fatigueModifier += profileModifier.fatigueModifier;
    }
  }
  if (decision === "placeKey") {
    modifier.successBonus += 6;
    modifier.injuryRiskModifier -= 6;
    modifier.moraleModifier -= 2;
  }
  if (decision === "placeMask") {
    modifier.successBonus += 8;
    modifier.injuryRiskModifier -= 3;
  }
  const profile = getAdvancedClassProfile(character.advancedClassId);
  const decisionReason = decision === "profileChoice" && profile ? `reason:${profile.floor20SuccessLineTh}` : decision === "placeMask" ? "reason:เศษหน้ากากผู้เฝ้าประตูช่วยให้เขาอ่านนายทะเบียนได้ดีขึ้น แต่ทำให้หอคอยจับตามองมากขึ้น" : undefined;
  return { ...trial, id: `${trial.id}-${decision}`, modifier, tags: decisionReason ? [...trial.tags, decisionReason] : trial.tags };
}

export function mapFloor20Action(decision: Floor20Decision, selectedAction: DivineActionId): DivineActionId {
  if (decision === "godWrites") return "blessing";
  if (decision === "rewriteRecord" || decision === "tearPage") return "silence";
  return selectedAction;
}

export function mapFloor20Decision(decision: Floor20Decision): EncounterDecisionId {
  if (decision === "rewriteRecord") return "self";
  if (decision === "tearPage") return "push";
  if (decision === "usePreparation" || decision === "placeKey" || decision === "placeMask") return "resource";
  if (decision === "profileChoice") return "classAction";
  return "continue";
}

export function getFloor20DecisionText(decision: Floor20Decision): string {
  const text: Record<Floor20Decision, string> = {
    acceptRecord: "เขายอมรับว่าชื่อบนสมุดคือชื่อของคนที่ผ่านเมืองร้างมาจริง",
    rewriteRecord: "เขาขีดทับบางบรรทัดด้วยมือตนเอง แม้หมึกจะกัดผิวเหมือนกรด",
    godWrites: "เขายอมให้เสียงจากเบื้องบนแตะปากกาอีกครั้ง",
    tearPage: "เขาปฏิเสธทั้งหน้า เหมือนบอกหอคอยว่ามันไม่มีสิทธิ์นิยามเขาฝ่ายเดียว",
    usePreparation: "สิ่งที่เตรียมไว้ถูกใช้เป็นหลักฐานว่าเขาไม่ได้มาถึงที่นี่ด้วยมือเปล่า",
    profileChoice: "คลาสขั้นสองของเขาไม่ใช่ชื่อใหม่ที่สวมทับ แต่เป็นคำตอบที่สิบเก้าชั้นก่อนหน้าค่อย ๆ เขียนขึ้น",
    placeKey: "กุญแจที่ไม่มีรูถูกวางลงบนหน้าสมุด และตัวหนังสือรอบๆ เริ่มเปิดออกเหมือนบานประตู",
    placeMask: "เศษหน้ากากถูกวางข้างชื่อ หมึกในสมุดอุ่นขึ้นเหมือนจำผู้เฝ้าประตูอีกคนหนึ่งได้",
  };
  return text[decision];
}

function trial(id: string, title: string, narrative: string, modifier: EncounterTemporaryModifiers, tags: string[]): EncounterMidpointOutcome {
  return { id, title, narrative, modifier, tags };
}

export function getFloor20ProfileResultLine(character: Character, success: boolean): string | undefined {
  const profile = getAdvancedClassProfile(character.advancedClassId);
  return success ? profile?.floor20SuccessLineTh : profile?.floor20FailureLineTh;
}

export function getFloor20RecordedIdentity(character: Character): string {
  const profile = getAdvancedClassProfile(character.advancedClassId);
  const advancedName = character.advancedClassName ?? getAdvancedClass(character)?.nameTh ?? "ผู้ผ่านประตูแรก";
  return `${character.name} — ${advancedName}\n${profile?.floor20SuccessLineTh ?? "ผู้ที่เดินผ่านเมืองร้างแล้วปล่อยให้หอคอยรู้ว่าเขาไม่ได้เป็นคนเดิมอีกต่อไป"}`;
}

function getProfileTrialTitle(profile: AdvancedClassProfile): string {
  const titles: Record<AdvancedClassArchetype, string> = {
    protector: "ชื่อที่แบกคนอื่นมาด้วย",
    survivor: "ชื่อที่ยังไม่ยอมถูกลบ",
    seeker: "ชื่อที่ถามกลับหอคอย",
    faithbound: "ชื่อใต้แสงของเทพ",
    independent: "ชื่อที่เขียนด้วยมือของตนเอง",
    shadow: "ชื่อที่ซ่อนอยู่ในช่องว่าง",
    broken: "ชื่อที่แตกร้าวแต่ยังอ่านออก",
    merciful: "ชื่อที่ไม่ลบชื่อผู้อื่น",
    craft: "ชื่อที่ประกอบจากเศษซาก",
    combat: "ชื่อที่ถูกตีขึ้นกลางการปะทะ",
  };
  return titles[profile.archetype];
}

function getProfileTrialModifier(profile: AdvancedClassProfile, character: Character, byPath: (pathId: PathId) => number): EncounterTemporaryModifiers {
  const pathBonus =
    profile.archetype === "protector"
      ? byPath("protector")
      : profile.archetype === "survivor" || profile.archetype === "craft" || profile.archetype === "combat"
        ? byPath("survivor")
        : profile.archetype === "seeker"
          ? byPath("seeker")
          : profile.archetype === "faithbound"
            ? byPath("faithbound")
            : profile.archetype === "independent"
              ? byPath("independent")
              : profile.archetype === "shadow"
                ? byPath("shadow")
                : profile.archetype === "broken"
                  ? byPath("broken")
                  : byPath("merciful");
  const dependencyRisk = profile.archetype === "faithbound" && character.divine.dependency >= 60 ? -3 : 0;
  const brokenRisk = profile.archetype === "broken" ? 4 : 0;
  const craftGuard = profile.archetype === "craft" ? -4 : 0;
  return {
    successBonus: 7 + pathBonus + dependencyRisk,
    injuryRiskModifier: profile.archetype === "shadow" ? -5 : craftGuard + brokenRisk,
    moraleModifier: profile.archetype === "protector" || profile.archetype === "merciful" ? 2 : profile.archetype === "broken" ? -3 : 0,
    fatigueModifier: profile.archetype === "craft" || profile.archetype === "seeker" ? 3 : 0,
  };
}

function getProfileDecisionModifier(profile: AdvancedClassProfile): EncounterTemporaryModifiers {
  const byArchetype: Record<AdvancedClassArchetype, EncounterTemporaryModifiers> = {
    protector: { successBonus: 7, injuryRiskModifier: -8, moraleModifier: 2, fatigueModifier: 4 },
    survivor: { successBonus: 8, injuryRiskModifier: -3, moraleModifier: 0, fatigueModifier: 2 },
    seeker: { successBonus: 10, injuryRiskModifier: 0, moraleModifier: 0, fatigueModifier: 5 },
    faithbound: { successBonus: 9, injuryRiskModifier: -2, moraleModifier: 2, fatigueModifier: 0 },
    independent: { successBonus: 9, injuryRiskModifier: 4, moraleModifier: 1, fatigueModifier: 0 },
    shadow: { successBonus: 8, injuryRiskModifier: -10, moraleModifier: -1, fatigueModifier: 0 },
    broken: { successBonus: 10, injuryRiskModifier: 8, moraleModifier: -3, fatigueModifier: 0 },
    merciful: { successBonus: 7, injuryRiskModifier: -4, moraleModifier: 3, fatigueModifier: 2 },
    craft: { successBonus: 10, injuryRiskModifier: -4, moraleModifier: 0, fatigueModifier: 6 },
    combat: { successBonus: 10, injuryRiskModifier: 8, moraleModifier: 0, fatigueModifier: 0 },
  };
  return byArchetype[profile.archetype];
}
