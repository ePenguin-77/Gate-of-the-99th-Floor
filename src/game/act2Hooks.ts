import { getAdvancedClassProfile, type AdvancedClassArchetype } from "../data/advancedClassProfiles";
import { getItem } from "./inventorySystem";
import { getDominantPaths } from "./pathAffinity";
import type { Character, EncounterDecisionId, EncounterTemporaryModifiers, FloorDefinition, NPC, PathId } from "../types/game";

export interface Act2HookContext {
  character: Character;
  floor: FloorDefinition;
  npcs?: NPC[];
  lifeDebtMarks?: number;
  towerPressure?: number;
}

export interface Act2FloorHooks {
  successBonus: number;
  injuryRiskModifier: number;
  moraleFailureModifier: number;
  hopeFailureModifier: number;
  sicknessFailureModifier: number;
  towerPressureModifier: number;
  pathChanges: Array<{ pathId: PathId; amount: number }>;
  specialLinesTh: string[];
  resultExplanationLines: string[];
  hasRegisterKeyChoice: boolean;
}

export interface Act2SpecialOption {
  id: string;
  labelTh: string;
  descriptionTh: string;
  requirementTextTh: string;
  effectPreviewTh: string;
  available: boolean;
  resolveKey: EncounterDecisionId;
  modifier: EncounterTemporaryModifiers;
  resultExplanationLineTh: string;
}

const emptyHooks: Act2FloorHooks = {
  successBonus: 0,
  injuryRiskModifier: 0,
  moraleFailureModifier: 0,
  hopeFailureModifier: 0,
  sicknessFailureModifier: 0,
  towerPressureModifier: 0,
  pathChanges: [],
  specialLinesTh: [],
  resultExplanationLines: [],
  hasRegisterKeyChoice: false,
};

export function getAct2FloorHooks({ character, floor, npcs = [], lifeDebtMarks = 0, towerPressure = 0 }: Act2HookContext): Act2FloorHooks {
  if (floor.floor < 11) return emptyHooks;
  const hooks: Act2FloorHooks = { ...emptyHooks, pathChanges: [], specialLinesTh: [], resultExplanationLines: [] };
  const equipped = character.equippedItems ?? [];
  const inventory = character.inventory ?? [];
  const hasItem = (itemId: string) => inventory.some((item) => item.itemId === itemId && item.quantity > 0) || equipped.includes(itemId);
  const hasEquippedWithTag = (tags: string[]) =>
    equipped.map((itemId) => getItem(itemId)).some((item) => item?.tags.some((tag) => tags.includes(tag)));
  const profile = getAdvancedClassProfile(character.advancedClassId);
  const advancedId = profile?.advancedClassId ?? "";
  const dominantPath = getDominantPaths(character, 1)[0]?.pathId;
  const childNpc = npcs.find((npc) => npc.id === "bell-child");
  const highNpcBond = npcs.find((npc) => npc.status === "available" && npc.relationship >= 60);

  if (floor.floor === 12 && hasEquippedWithTag(["darkness", "light", "climb"])) {
    hooks.successBonus += 8;
    hooks.injuryRiskModifier -= 8;
    hooks.resultExplanationLines.push("อุปกรณ์ที่พกขึ้นหอคอยช่วยให้โรงเก็บเสียงฝีเท้าอ่านง่ายขึ้น");
  }

  if (floor.floor === 14 && hasItem("ink_stained_map")) {
    hooks.successBonus += towerPressure >= 10 ? 2 : 6;
    hooks.resultExplanationLines.push(
      towerPressure >= 10
        ? "แผนที่เปื้อนหมึกช่วยได้บ้าง แต่ความกดดันของหอคอยทำให้เส้นทางบนกระดาษไม่น่าไว้ใจเต็มที่"
        : "แผนที่เปื้อนหมึกช่วยลดความเสี่ยงจากกฎปลอมในห้องสมุด",
    );
  }

  if (floor.floor === 16) {
    if (childNpc?.status === "available") {
      hooks.hopeFailureModifier -= 4;
      hooks.pathChanges.push({ pathId: "merciful", amount: 1 }, { pathId: "protector", amount: 1 });
      hooks.specialLinesTh.push("เสียงระฆังแตกดังขึ้นในศาลา แต่เดนจำได้ว่าเด็กคนนั้นยังรออยู่ที่เมืองพักพิง");
      hooks.resultExplanationLines.push("ความทรงจำเรื่องเด็กใต้ระฆังแตกช่วยให้เขาไม่ปล่อยคำสัญญาทั้งหมดให้แตกสลาย");
    } else if (character.memories.some((memory) => memory.tags.includes("guilt"))) {
      hooks.moraleFailureModifier += 3;
      hooks.resultExplanationLines.push("ความทรงจำแห่งความผิดทำให้ศาลาคำสัญญากดใจเขาหนักขึ้น");
    }
  }

  if (floor.floor === 17 && (hasItem("rough_bandage") || hasItem("bitter_medicine") || hasEquippedWithTag(["protection", "fate"]))) {
    hooks.injuryRiskModifier -= 10;
    hooks.resultExplanationLines.push("ของรักษาหรือเครื่องรางช่วยลดราคาจากไฟและค้อนในโรงตีเหล็ก");
  }

  if (floor.floor === 18 && lifeDebtMarks > 0) {
    hooks.moraleFailureModifier += 2;
    hooks.pathChanges.push({ pathId: "broken", amount: 1 });
    hooks.specialLinesTh.push("ชื่อของผู้ที่ไม่เคยกลับบ้านปรากฏบนป้ายถนนเพียงเสี้ยววินาที");
    hooks.resultExplanationLines.push("ตราหนี้ชีวิตทำให้ถนนที่ย้อนจำชื่อเรียกเงาของผู้สูญหายขึ้นมา");
  }

  if (floor.floor === 20) {
    if (highNpcBond) {
      hooks.successBonus += 3;
      hooks.hopeFailureModifier -= 2;
      hooks.specialLinesTh.push("ชื่อของเขาไม่ได้ยืนอยู่ลำพังในบันทึก ยังมีร่องรอยของคนที่รอเขากลับอยู่");
      hooks.resultExplanationLines.push(`${highNpcBond.nameTh}ยังทิ้งร่องรอยไว้ในบันทึก ทำให้เขารู้ว่าตนไม่ได้เดินมาถึงตรงนี้ลำพัง`);
    }
    if (hasItem("gatekeeper_mask_shard")) {
      hooks.successBonus += 8;
      hooks.towerPressureModifier += 1;
      hooks.specialLinesTh.push("เศษหน้ากากในกระเป๋าอุ่นขึ้น ราวกับมันจำผู้เฝ้าประตูอีกคนหนึ่งได้");
      hooks.resultExplanationLines.push("เศษหน้ากากผู้เฝ้าประตูช่วยให้เขาอ่านสายตาของนายทะเบียนได้ดีขึ้น แต่ทำให้หอคอยจับตามองมากกว่าเดิม");
    }
    if (hasItem("key_without_keyhole")) {
      hooks.hasRegisterKeyChoice = true;
      hooks.resultExplanationLines.push("กุญแจที่ไม่มีรูเปิดทางเลือกแปลกประหลาดบนหน้าสมุดทะเบียน");
    }
  }

  if (floor.floor >= 11 && profile) {
    const classLine = getAdvancedClassHookLine(profile, floor, dominantPath);
    if (classLine) {
      hooks.successBonus += classLine.bonus;
      hooks.moraleFailureModifier += classLine.moraleRisk;
      hooks.resultExplanationLines.push(classLine.text);
    }
  }

  return hooks;
}

export function getAct2SpecialHooks(context: Act2HookContext): { specialLinesTh: string[]; specialOptions: Act2SpecialOption[]; resultExplanationLinesTh: string[] } {
  const { character, floor, npcs = [], lifeDebtMarks = 0, towerPressure = 0 } = context;
  if (floor.floor < 11) return { specialLinesTh: [], specialOptions: [], resultExplanationLinesTh: [] };

  const profile = getAdvancedClassProfile(character.advancedClassId);
  const equipped = character.equippedItems ?? [];
  const inventory = character.inventory ?? [];
  const hasItem = (itemId: string) => inventory.some((item) => item.itemId === itemId && item.quantity > 0) || equipped.includes(itemId);
  const hasEquippedWithTag = (tags: string[]) =>
    equipped.map((itemId) => getItem(itemId)).some((item) => item?.tags.some((tag) => tags.includes(tag)));
  const hasArchetype = (...archetypes: AdvancedClassArchetype[]) => Boolean(profile && archetypes.includes(profile.archetype));
  const hasStrongTag = (...tags: string[]) => Boolean(profile?.strongTags.some((tag) => tags.includes(tag)));
  const childNpc = npcs.find((npc) => npc.id === "bell-child" && npc.status === "available");
  const hasGuiltMemory = character.memories.some((memory) => memory.tags.includes("guilt") || memory.tags.includes("broken"));
  const independentOrSurvivorHigh = (character.pathAffinity?.independent ?? 0) >= 10 || (character.pathAffinity?.survivor ?? 0) >= 10;
  const options: Act2SpecialOption[] = [];

  const add = (option: Act2SpecialOption) => options.push(option);
  const mod = (successBonus = 0, injuryRiskModifier = 0, moraleModifier = 0, fatigueModifier = 0): EncounterTemporaryModifiers => ({
    successBonus,
    injuryRiskModifier,
    moraleModifier,
    fatigueModifier,
  });

  if (floor.floor === 12) {
    add({
      id: "f12-cracked-lantern",
      labelTh: "ใช้ตะเกียงร้าวนำทาง",
      descriptionTh: "ทำให้ความมืดในโรงเก็บเสียงฝีเท้ามีขอบเขตขึ้นมาเล็กน้อย",
      requirementTextTh: "ต้องพกอุปกรณ์ที่ให้แสงหรือช่วยนำทางขึ้นหอคอย",
      effectPreviewTh: "โอกาสผ่าน +8% / ความเสี่ยงบาดเจ็บ -6% / อุปกรณ์อาจแตกหากถูกใช้",
      available: hasEquippedWithTag(["darkness", "light", "climb"]),
      resolveKey: "resource",
      modifier: mod(8, -6),
      resultExplanationLineTh: "ทางเลือกพิเศษ “ใช้ตะเกียงร้าวนำทาง” ช่วยให้ความมืดมีขอบเขตและลดเสียงพลาดของเขา",
    });
    add({
      id: "f12-shadow-step",
      labelTh: "เดินแบบเงา",
      descriptionTh: "ลดเสียงฝีเท้าโดยยอมทิ้งโอกาสเก็บของบางส่วนไว้ข้างหลัง",
      requirementTextTh: "ต้องเป็นสายเงา นักสำรวจ หรือเงาเร้น",
      effectPreviewTh: "โอกาสผ่าน +7% / ความเสี่ยงบาดเจ็บ -8% / รางวัลอาจลดลง",
      available: hasArchetype("shadow") || ["rogue", "scout"].includes(character.classId),
      resolveKey: "self",
      modifier: mod(7, -8),
      resultExplanationLineTh: "ทางเลือกพิเศษ “เดินแบบเงา” ทำให้เสียงฝีเท้าของเขาเบาลงจนกับดักฟังผิดจังหวะ",
    });
  }

  if (floor.floor === 14) {
    add({
      id: "f14-map-compare",
      labelTh: "เทียบข้อมูลกับแผนที่เปื้อนหมึก",
      descriptionTh: "ใช้แผนที่ตรวจว่ากฎในห้องสมุดกำลังหลอกเขาหรือไม่",
      requirementTextTh: "ต้องมีแผนที่เปื้อนหมึก",
      effectPreviewTh: towerPressure >= 10 ? "โอกาสผ่าน +3% / ลดผลเสียจากข้อมูลปลอมเล็กน้อย แต่แรงกดดันอาจบิดแผนที่" : "โอกาสผ่าน +7% / ลดผลเสียจากข้อมูลปลอม",
      available: hasItem("ink_stained_map"),
      resolveKey: "resource",
      modifier: mod(towerPressure >= 10 ? 3 : 7, 0, 0, 1),
      resultExplanationLineTh: "ทางเลือกพิเศษ “เทียบข้อมูลกับแผนที่เปื้อนหมึก” ช่วยให้เขาจับกฎปลอมได้ก่อนเชื่อมันทั้งหมด",
    });
    add({
      id: "f14-reverse-rule",
      labelTh: "อ่านกฎกลับด้าน",
      descriptionTh: "หยุดอ่านช่องว่างแทนตัวอักษร และลองตีความหอคอยจากสิ่งที่มันไม่ยอมเขียน",
      requirementTextTh: "เหมาะกับคลาสขั้นสองสายแสวงหาความจริงหรือนักปราชญ์",
      effectPreviewTh: "โอกาสผ่าน +10% / ความเหนื่อยล้า +5",
      available: hasArchetype("seeker") || character.classId === "scholar",
      resolveKey: "self",
      modifier: mod(10, 0, 0, 5),
      resultExplanationLineTh: "ทางเลือกพิเศษ “อ่านกฎกลับด้าน” ทำให้เขามองเห็นกฎที่ซ่อนอยู่ในสิ่งที่ห้องสมุดไม่ยอมตอบ",
    });
  }

  if (floor.floor === 16) {
    add({
      id: "f16-bell-child",
      labelTh: "นึกถึงเด็กใต้ระฆังแตก",
      descriptionTh: "ความทรงจำของเด็กที่รอดกลับเมืองช่วยให้เขาเชื่อว่าคำสัญญาบางอย่างยังรักษาได้",
      requirementTextTh: "ต้องช่วยเด็กใต้ระฆังแตกไว้แล้ว",
      effectPreviewTh: "ลดผลเสียต่อความหวัง / เพิ่มร่องรอยผู้เมตตาและผู้ปกป้อง",
      available: Boolean(childNpc),
      resolveKey: "self",
      modifier: mod(6, 0, 2),
      resultExplanationLineTh: "ทางเลือกพิเศษ “นึกถึงเด็กใต้ระฆังแตก” ช่วยให้เขายังจำได้ว่าคำสัญญาบางอย่างรอดกลับเมืองได้จริง",
    });
    add({
      id: "f16-accept-guilt",
      labelTh: "ยอมรับความผิดที่แบกไว้",
      descriptionTh: "ยอมให้ศาลากดน้ำหนักความผิดลงมาตอนนี้ เพื่อไม่ให้มันหักเขาในจังหวะล้มเหลว",
      requirementTextTh: "ต้องมีความทรงจำเกี่ยวกับความผิดหรือรอยแตกร้าว",
      effectPreviewTh: "ขวัญกำลังใจ -3 ตอนนี้ / ลดแรงกระแทกทางใจหากพลาด",
      available: hasGuiltMemory,
      resolveKey: "self",
      modifier: mod(5, 0, -3),
      resultExplanationLineTh: "ทางเลือกพิเศษ “ยอมรับความผิดที่แบกไว้” ทำให้ความผิดไม่กลายเป็นกับดักที่ศาลาใช้ย้อนใส่เขา",
    });
  }

  if (floor.floor === 17) {
    add({
      id: "f17-bandage-burn",
      labelTh: "ใช้ผ้าพันแผลเตรียมรับแผลไหม้",
      descriptionTh: "เตรียมกดแผลไว้ก่อนที่ไฟในโรงตีเหล็กจะเรียกเก็บเลือด",
      requirementTextTh: "ต้องมีผ้าพันแผลหยาบ",
      effectPreviewTh: "ความเสี่ยงบาดเจ็บ -10%",
      available: hasItem("rough_bandage"),
      resolveKey: "resource",
      modifier: mod(2, -10),
      resultExplanationLineTh: "ทางเลือกพิเศษ “ใช้ผ้าพันแผลเตรียมรับแผลไหม้” ช่วยลดราคาจากไฟและค้อนในโรงตีเหล็ก",
    });
    add({
      id: "f17-scrap-adapt",
      labelTh: "ดัดแปลงอุปกรณ์ด้วยเศษเหล็ก",
      descriptionTh: "ใช้ซากโรงตีเหล็กเป็นวัสดุฉุกเฉิน แม้จะทำให้ร่างกายเหนื่อยขึ้น",
      requirementTextTh: "เหมาะกับช่างหรือคลาสขั้นสองสายประดิษฐ์",
      effectPreviewTh: "โอกาสผ่าน +10% / ความเหนื่อยล้า +6",
      available: hasArchetype("craft") || character.classId === "tinker",
      resolveKey: "self",
      modifier: mod(10, -2, 0, 6),
      resultExplanationLineTh: "ทางเลือกพิเศษ “ดัดแปลงอุปกรณ์ด้วยเศษเหล็ก” ทำให้ซากโรงตีเหล็กกลายเป็นเครื่องมือ ไม่ใช่แค่กับดัก",
    });
  }

  if (floor.floor === 18) {
    add({
      id: "f18-call-lost",
      labelTh: "เรียกชื่อผู้ที่สูญหาย",
      descriptionTh: "ยอมให้ตราหนี้ชีวิตสะท้อนกลับมา เพื่อหาทางผ่านถนนที่ย้อนจำชื่อ",
      requirementTextTh: "ต้องมีตราหนี้ชีวิต",
      effectPreviewTh: "ผู้แตกร้าว +1 / เสี่ยงขวัญกำลังใจ / อาจเกิดความทรงจำสะท้อน",
      available: lifeDebtMarks > 0,
      resolveKey: "self",
      modifier: mod(6, 0, -2),
      resultExplanationLineTh: "ทางเลือกพิเศษ “เรียกชื่อผู้ที่สูญหาย” ทำให้ถนนเผยเงาของคนที่ไม่เคยกลับบ้าน แต่ก็เพิ่มน้ำหนักบนใจเขา",
    });
    add({
      id: "f18-own-name",
      labelTh: "เดินตามชื่อของตัวเอง",
      descriptionTh: "ไม่ไล่ตามป้ายถนนทุกป้าย แต่ยึดชื่อของตนเองเป็นทิศทาง",
      requirementTextTh: "ต้องมีเส้นทางผู้ยืนหยัดด้วยตนเองหรือผู้เอาตัวรอดสูง",
      effectPreviewTh: "โอกาสผ่าน +8% / หากสำเร็จ ความหวังอาจฟื้นเล็กน้อย",
      available: independentOrSurvivorHigh,
      resolveKey: "self",
      modifier: mod(8, 0, 1),
      resultExplanationLineTh: "ทางเลือกพิเศษ “เดินตามชื่อของตัวเอง” ช่วยให้เขาไม่หลงไปกับชื่อของคนอื่นบนถนน",
    });
  }

  if (floor.floor === 19) {
    add({
      id: "f19-bargain-loophole",
      labelTh: "ต่อรองด้วยช่องโหว่",
      descriptionTh: "อ่านข้อยกเว้นในภาษีของผู้เฝ้าแทนการจ่ายตามที่มันเรียก",
      requirementTextTh: "เหมาะกับช่าง นักปราชญ์ หรือสายแสวงหาความจริง",
      effectPreviewTh: "โอกาสผ่าน +6% / ลดแรงกดจากการเสียทอง",
      available: hasArchetype("craft", "seeker") || ["tinker", "scholar"].includes(character.classId),
      resolveKey: "self",
      modifier: mod(6),
      resultExplanationLineTh: "ทางเลือกพิเศษ “ต่อรองด้วยช่องโหว่” ทำให้ด่านภาษีเก็บราคาจากเขาได้ไม่เต็มคำขู่",
    });
    add({
      id: "f19-pay-shadow",
      labelTh: "จ่ายด้วยเงาแทนทอง",
      descriptionTh: "รักษาทองไว้โดยยอมให้บางส่วนของชื่อหายไปจากสายตาผู้คน",
      requirementTextTh: "ต้องเป็นสายเงาหรือเงาเร้น",
      effectPreviewTh: "โอกาสผ่าน +8% / รักษาทองไว้ / ความไว้ใจหรือศรัทธาอาจสั่นคลอน",
      available: hasArchetype("shadow") || character.classId === "rogue",
      resolveKey: "self",
      modifier: mod(8, -4, -1),
      resultExplanationLineTh: "ทางเลือกพิเศษ “จ่ายด้วยเงาแทนทอง” ช่วยให้เขารักษาทรัพยากรไว้ แต่ทำให้ตัวตนพร่าเลือนกว่าเดิม",
    });
  }

  if (floor.floor === 20) {
    add({
      id: "f20-key-register",
      labelTh: "วางกุญแจที่ไม่มีรูบนหน้าสมุด",
      descriptionTh: "ใช้ของผิดปกติเปิดช่องว่างในบันทึกที่ไม่ควรถูกเปิด",
      requirementTextTh: "ต้องมีกุญแจที่ไม่มีรู",
      effectPreviewTh: "เปิดผลลัพธ์ประหลาด / อาจลดความกดดันของหอคอยมาก แต่ทิ้งความทรงจำผิดปกติ",
      available: hasItem("key_without_keyhole"),
      resolveKey: "resource",
      modifier: mod(6, -6, -2),
      resultExplanationLineTh: "กุญแจที่ไม่มีรูเปิดทางเลือกแปลกประหลาดบนหน้าสมุดทะเบียน",
    });
    add({
      id: "f20-mask-shard",
      labelTh: "วางเศษหน้ากากผู้เฝ้าประตูข้างชื่อ",
      descriptionTh: "ให้เศษหน้ากากจากประตูแรกเป็นพยานต่อหน้านายทะเบียน",
      requirementTextTh: "ต้องมีเศษหน้ากากผู้เฝ้าประตู",
      effectPreviewTh: "โอกาสผ่าน +8% / ความกดดันของหอคอย +1",
      available: hasItem("gatekeeper_mask_shard"),
      resolveKey: "resource",
      modifier: mod(8, -3),
      resultExplanationLineTh: "เศษหน้ากากผู้เฝ้าประตูช่วยให้เขาอ่านนายทะเบียนได้ดีขึ้น แต่ทำให้หอคอยจับตามองมากขึ้น",
    });
  }

  return {
    specialLinesTh: options.filter((option) => option.available).map((option) => option.descriptionTh),
    specialOptions: options,
    resultExplanationLinesTh: options.filter((option) => option.available).map((option) => option.resultExplanationLineTh),
  };
}

function getAdvancedClassHookLine(
  profile: { archetype: AdvancedClassArchetype; strongTags: string[]; weakTags: string[]; floor20SuccessLineTh: string; drawbackWarningTh: string },
  floor: FloorDefinition,
  dominantPath?: PathId,
): { bonus: number; moraleRisk: number; text: string } | null {
  const floorTags = new Set([floor.challengeType, ...(floor.tags ?? [])]);
  const strongMatches = profile.strongTags.filter((tag) => floorTags.has(tag)).length;
  const weakMatches = profile.weakTags.filter((tag) => floorTags.has(tag)).length;
  if (strongMatches > 0) {
    return {
      bonus: Math.min(12, 6 + strongMatches * 2),
      moraleRisk: 0,
      text: `คลาสขั้นสองของเขาเข้ากับบททดสอบนี้: ${profile.floor20SuccessLineTh}`,
    };
  }
  if (weakMatches > 0) {
    return {
      bonus: -Math.min(7, 3 + weakMatches * 2),
      moraleRisk: 1,
      text: `ข้อเสียของคลาสขั้นสองเริ่มชัดขึ้น: ${profile.drawbackWarningTh}`,
    };
  }
  if (floor.floor === 18 && (profile.archetype === "survivor" || dominantPath === "broken")) {
    return { bonus: 8, moraleRisk: dominantPath === "broken" ? 3 : 0, text: "รอยแตกร้าวและสัญชาตญาณเอาตัวรอดช่วยให้เขาไม่หลงชื่อของตนเอง แม้มันจะเจ็บลึก" };
  }
  if (floor.floor === 20) {
    return { bonus: profile.archetype === "seeker" ? 10 : profile.archetype === "shadow" || profile.archetype === "faithbound" ? 9 : 7, moraleRisk: profile.archetype === "shadow" ? 1 : 0, text: profile.floor20SuccessLineTh };
  }
  return null;
}
