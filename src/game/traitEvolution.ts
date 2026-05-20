import type { Character, DivineActionId, FloorDefinition, FloorResult, TraitEvolution, TraitProgress } from "../types/game";
import { hasMemoryTag } from "./memorySystem";

interface TraitEvolutionContext {
  character: Character;
  floor: FloorDefinition;
  result: FloorResult;
  divineAction: DivineActionId;
}

export const traitEvolutions: TraitEvolution[] = [
  {
    id: "fear-shadowed",
    baseTraitId: "fear-darkness",
    nameTh: "ขยาดเงา",
    descriptionTh: "ความมืดไม่ได้เป็นเพียงสถานที่อีกต่อไป แต่มันกลายเป็นบางสิ่งที่รออยู่ในใจ",
    path: "negative",
    requirements: ["ล้มเหลวในเหตุการณ์ความมืดหลายครั้ง", "มีความทรงจำบาดแผลเกี่ยวกับความมืด"],
    effects: { scoreModifier: -2, survival: { morale: -4 } },
  },
  {
    id: "fear-walked-through",
    baseTraitId: "fear-darkness",
    nameTh: "ก้าวผ่านเงา",
    descriptionTh: "เขายังกลัวความมืด แต่ตอนนี้รู้แล้วว่าความกลัวไม่จำเป็นต้องเป็นผู้เลือกทาง",
    path: "positive",
    requirements: ["รอดจากชั้นมืดด้วยความเงียบหรือการยืนหยัด", "มีการยืนหยัดด้วยตนเองสูงขึ้น"],
    effects: { scoreModifier: 2, stats: { willpower: 1 } },
  },
  {
    id: "compassion-protector",
    baseTraitId: "compassionate",
    nameTh: "ผู้ปกป้อง",
    descriptionTh: "ความเมตตาของเขาไม่ใช่ความอ่อนแอ แต่เป็นเหตุผลที่ยังยืนอยู่",
    path: "positive",
    requirements: ["ช่วยตัวละครอื่นสำเร็จหลายครั้ง"],
    effects: { scoreModifier: 2, survival: { morale: 3 } },
  },
  {
    id: "compassion-self-sacrificing",
    baseTraitId: "compassionate",
    nameTh: "เสียสละเกินตัว",
    descriptionTh: "เขาช่วยผู้อื่นง่ายขึ้น แต่บางครั้งลืมว่าตนเองก็เป็นคนที่ต้องรอด",
    path: "doubleEdged",
    requirements: ["ช่วยผู้อื่นขณะหิว บาดเจ็บ หรืออ่อนล้า"],
    effects: { scoreModifier: 1, survival: { injury: 3 } },
  },
  {
    id: "hotheaded-reckless",
    baseTraitId: "hot-headed",
    nameTh: "หุนหันพลันแล่น",
    descriptionTh: "เขาเปิดทางด้วยแรงปะทะได้ดีขึ้น แต่ราคาของความเร็วคือแผลที่มาไวกว่าเดิม",
    path: "negative",
    requirements: ["ล้มเหลวจากการปะทะหรือการตัดสินใจเสี่ยงซ้ำๆ"],
    effects: { scoreModifier: 1, survival: { injury: 5 } },
  },
  {
    id: "hotheaded-restraint",
    baseTraitId: "hot-headed",
    nameTh: "เรียนรู้การยับยั้ง",
    descriptionTh: "ไฟในใจยังอยู่ แต่เขาเริ่มรู้ว่าเมื่อไรควรปล่อย และเมื่อไรควรกำมันไว้",
    path: "positive",
    requirements: ["รอดจากการต่อสู้เสี่ยงด้วยเสียงกระซิบหรือความเงียบ"],
    effects: { scoreModifier: 2 },
  },
  {
    id: "faith-blessing-vessel",
    baseTraitId: "strong-faith",
    nameTh: "ผู้รับพร",
    descriptionTh: "พรแห่งเทพไหลผ่านเขาง่ายขึ้น ราวกับร่างกายเริ่มจดจำแสงนั้นได้",
    path: "positive",
    requirements: ["ใช้พรแห่งเทพสำเร็จหลายครั้ง"],
    effects: { scoreModifier: 2, divine: { faith: 2 } },
  },
  {
    id: "faith-sky-dependent",
    baseTraitId: "strong-faith",
    nameTh: "พึ่งพาเสียงฟ้า",
    descriptionTh: "เสียงจากเบื้องบนช่วยเขาได้มากขึ้น แต่ความเงียบเริ่มน่ากลัวเกินไป",
    path: "doubleEdged",
    requirements: ["พึ่งพาเสียงกระซิบหรือพรบ่อยครั้ง", "การพึ่งพาเทพสูง"],
    effects: { scoreModifier: 1, divine: { dependency: 3 } },
  },
  {
    id: "skeptical-standing",
    baseTraitId: "skeptical",
    nameTh: "ผู้ยืนหยัด",
    descriptionTh: "เขาไม่ได้ไร้ศรัทธา เขาเพียงเรียนรู้ว่าขาของตนเองยังพาไปต่อได้",
    path: "positive",
    requirements: ["ศรัทธาต่ำ การยืนหยัดสูง และรอดหลายชั้น"],
    effects: { scoreModifier: 2, divine: { independence: 2 } },
  },
  {
    id: "skeptical-defiant",
    baseTraitId: "skeptical",
    nameTh: "ผู้ไม่เชื่อฟัง",
    descriptionTh: "เขาได้ยินเสียงเทพ แต่ไม่แน่ใจอีกต่อไปว่าเสียงนั้นสมควรถูกเชื่อเสมอ",
    path: "negative",
    requirements: ["คำชี้นำจากเทพตามมาด้วยความล้มเหลวซ้ำๆ"],
    effects: { scoreModifier: -1, divine: { faith: -2 } },
  },
  {
    id: "weakbody-enduring",
    baseTraitId: "weak-body",
    nameTh: "ร่างเปราะ ใจไม่แตก",
    descriptionTh: "ร่างกายยังอ่อนแรง แต่ใจเรียนรู้วิธีไม่แตกสลายไปพร้อมกัน",
    path: "positive",
    requirements: ["รอดจากความอ่อนล้าหรือบาดแผลซ้ำๆ"],
    effects: { stats: { willpower: 1 }, survival: { morale: 2 } },
  },
];

export function updateTraitProgress(context: TraitEvolutionContext): { character: Character; updates: TraitProgress[]; evolved: TraitEvolution[] } {
  let character = structuredClone(context.character);
  const updates: TraitProgress[] = [];
  const evolved: TraitEvolution[] = [];
  const ownedTraitIds = new Set(character.traits.map((trait) => trait.id));

  traitEvolutions.forEach((evolution) => {
    if (!ownedTraitIds.has(evolution.baseTraitId) || character.evolvedTraits.includes(evolution.id)) return;
    const delta = calculateProgressDelta(evolution, context);
    if (delta <= 0) return;
    const current = character.traitProgress.find((progress) => progress.traitId === evolution.baseTraitId && progress.currentPath === evolution.id) ?? {
      traitId: evolution.baseTraitId,
      currentPath: evolution.id,
      progress: 0,
      possibleEvolutions: getPossibleEvolutionNames(evolution.baseTraitId),
      history: [],
    };
    const nextProgress: TraitProgress = {
      ...current,
      progress: Math.min(100, current.progress + delta),
      possibleEvolutions: getPossibleEvolutionNames(evolution.baseTraitId),
      history: [`${evolution.nameTh} +${delta}%`, ...current.history].slice(0, 6),
    };

    character.traitProgress = [
      nextProgress,
      ...character.traitProgress.filter((progress) => !(progress.traitId === nextProgress.traitId && progress.currentPath === nextProgress.currentPath)),
    ];
    updates.push(nextProgress);

    if (nextProgress.progress >= 100) {
      character = applyEvolution(character, evolution);
      evolved.push(evolution);
    }
  });

  return { character, updates, evolved };
}

export function calculateTraitEvolutionModifier(character: Character, contextTags: string[], divineAction?: DivineActionId): number {
  return character.evolvedTraits.reduce((total, evolutionId) => {
    const evolution = traitEvolutions.find((item) => item.id === evolutionId);
    if (!evolution) return total;
    let modifier = evolution.effects.scoreModifier ?? 0;
    if (evolution.id === "fear-shadowed" && contextTags.includes("darkness")) modifier -= 2;
    if (evolution.id === "fear-walked-through" && contextTags.includes("darkness")) modifier += 2;
    if (evolution.id === "compassion-protector" && contextTags.includes("npc")) modifier += 2;
    if (evolution.id === "faith-blessing-vessel" && divineAction === "blessing") modifier += 2;
    if (evolution.id === "faith-sky-dependent" && divineAction === "silence") modifier -= 2;
    if (evolution.id === "skeptical-standing" && divineAction === "silence") modifier += 2;
    if (evolution.id === "skeptical-defiant" && divineAction && divineAction !== "silence") modifier -= 1;
    return total + modifier;
  }, 0);
}

function calculateProgressDelta(evolution: TraitEvolution, context: TraitEvolutionContext): number {
  const { character, floor, result, divineAction } = context;
  const floorText = `${floor.title} ${floor.description}`;
  const isDark = floor.floor === 2 || floorText.includes("มืด") || floorText.includes("เงา");
  const strained = character.survival.hunger >= 70 || character.survival.fatigue >= 70 || character.survival.injury >= 40;
  const cleared = result.level === "greatSuccess" || result.level === "success" || result.level === "costlySuccess";
  const failed = result.level === "failure" || result.level === "criticalFailure";

  if (evolution.id === "fear-shadowed" && isDark && failed) return hasMemoryTag(character, "darkness") ? 28 : 22;
  if (evolution.id === "fear-walked-through" && isDark && cleared && (divineAction === "silence" || character.divine.independence >= 35)) return 26;
  if (evolution.id === "compassion-protector" && floor.challengeType === "npc" && cleared) return 26;
  if (evolution.id === "compassion-self-sacrificing" && floor.challengeType === "npc" && strained) return 24;
  if (evolution.id === "hotheaded-reckless" && (floor.challengeType === "combat" || floor.challengeType === "moral") && failed) return 24;
  if (evolution.id === "hotheaded-restraint" && floor.challengeType === "combat" && cleared && (divineAction === "whisper" || divineAction === "silence")) return 24;
  if (evolution.id === "faith-blessing-vessel" && divineAction === "blessing" && cleared) return 24;
  if (evolution.id === "faith-sky-dependent" && (divineAction === "blessing" || divineAction === "whisper") && character.divine.dependency >= 35) return 22;
  if (evolution.id === "skeptical-standing" && divineAction === "silence" && cleared && character.divine.independence >= 30) return 22;
  if (evolution.id === "skeptical-defiant" && divineAction !== "silence" && failed) return 22;
  if (evolution.id === "weakbody-enduring" && (character.survival.fatigue >= 70 || character.survival.injury >= 40) && cleared) return 22;
  return 0;
}

function applyEvolution(character: Character, evolution: TraitEvolution): Character {
  const next = structuredClone(character);
  next.evolvedTraits = Array.from(new Set([...next.evolvedTraits, evolution.id]));
  Object.entries(evolution.effects.stats ?? {}).forEach(([key, value]) => {
    next.stats[key as keyof Character["stats"]] = Math.max(1, Math.min(25, next.stats[key as keyof Character["stats"]] + (value ?? 0)));
  });
  Object.entries(evolution.effects.survival ?? {}).forEach(([key, value]) => {
    next.survival[key as keyof Character["survival"]] = Math.max(0, Math.min(100, next.survival[key as keyof Character["survival"]] + (value ?? 0)));
  });
  Object.entries(evolution.effects.divine ?? {}).forEach(([key, value]) => {
    next.divine[key as keyof Character["divine"]] = Math.max(0, Math.min(100, next.divine[key as keyof Character["divine"]] + (value ?? 0)));
  });
  return next;
}

function getPossibleEvolutionNames(baseTraitId: string): string[] {
  return traitEvolutions.filter((evolution) => evolution.baseTraitId === baseTraitId).map((evolution) => evolution.nameTh);
}
