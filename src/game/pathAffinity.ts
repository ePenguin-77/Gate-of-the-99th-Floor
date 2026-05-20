import type { Character, DivineActionId, FloorDefinition, FloorIntel, FloorResultLevel, GameState, PathAffinity, PathAffinityChange, PathId } from "../types/game";

export const pathLabels: Record<PathId, string> = {
  protector: "ผู้ปกป้อง",
  survivor: "ผู้เอาตัวรอด",
  seeker: "ผู้แสวงหาความจริง",
  faithbound: "ผู้ผูกพันกับเทพ",
  independent: "ผู้ยืนหยัดด้วยตนเอง",
  shadow: "เงาแห่งหอคอย",
  broken: "ผู้แตกร้าว",
  merciful: "ผู้เมตตา",
};

const pathDescriptions: Record<PathId, string> = {
  protector: "เขาถูกหล่อหลอมด้วยการยืนขวางอันตรายแทนผู้อื่น",
  survivor: "ทุกบาดแผลสอนให้เขาใช้ชีวิตต่อ แม้โลกจะไม่อ่อนโยน",
  seeker: "เขาเริ่มมองหาความจริงที่ซ่อนอยู่ใต้กฎของหอคอย",
  faithbound: "เสียงของเทพกลายเป็นเชือกที่ผูกเขาไว้กับท้องฟ้า",
  independent: "เขาเรียนรู้ว่าความเงียบก็อาจเป็นพื้นที่ให้ยืนด้วยตนเอง",
  shadow: "เขาเริ่มเข้าใจวิธีผ่านโลกนี้โดยไม่ให้โลกเห็นเขา",
  broken: "บางสิ่งในตัวเขาร้าว แต่รอยร้าวนั้นยังไม่ทำให้เขาหยุดเดิน",
  merciful: "เขายังเลือกเห็นชีวิตอื่น แม้ตนเองแทบเอาตัวไม่รอด",
};

export function createDefaultPathAffinity(): PathAffinity {
  return {
    protector: 0,
    survivor: 0,
    seeker: 0,
    faithbound: 0,
    independent: 0,
    shadow: 0,
    broken: 0,
    merciful: 0,
  };
}

export function normalizePathAffinity(pathAffinity?: Partial<PathAffinity>): PathAffinity {
  return { ...createDefaultPathAffinity(), ...(pathAffinity ?? {}) };
}

export function adjustPathAffinity(character: Character, pathId: PathId, amount: number): Character {
  const current = normalizePathAffinity(character.pathAffinity);
  return {
    ...character,
    pathAffinity: {
      ...current,
      [pathId]: Math.max(0, current[pathId] + amount),
    },
  };
}

export function getDominantPaths(character: Character, count = 3): Array<{ pathId: PathId; label: string; value: number; description: string }> {
  const affinity = normalizePathAffinity(character.pathAffinity);
  return (Object.keys(affinity) as PathId[])
    .map((pathId) => ({ pathId, label: getPathLabel(pathId), value: affinity[pathId], description: getPathDescription(pathId) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

export function getPathLabel(pathId: PathId): string {
  return pathLabels[pathId];
}

export function getPathDescription(pathId: PathId): string {
  return pathDescriptions[pathId];
}

export function formatPathChanges(changes: PathAffinityChange[]): string[] {
  return changes.map((change) => `${change.label} ${change.amount > 0 ? "+" : ""}${change.amount}`);
}

export function applyPathChanges(character: Character, changes: Array<{ pathId: PathId; amount: number }>): { character: Character; changes: PathAffinityChange[] } {
  const merged = new Map<PathId, number>();
  changes.forEach((change) => {
    if (change.amount === 0) return;
    merged.set(change.pathId, (merged.get(change.pathId) ?? 0) + change.amount);
  });

  let nextCharacter = { ...character, pathAffinity: normalizePathAffinity(character.pathAffinity) };
  const visibleChanges: PathAffinityChange[] = [];
  merged.forEach((amount, pathId) => {
    nextCharacter = adjustPathAffinity(nextCharacter, pathId, amount);
    visibleChanges.push({ pathId, label: getPathLabel(pathId), amount });
  });
  return { character: nextCharacter, changes: visibleChanges };
}

export function getClassRelevantPath(classId: string): PathId {
  if (classId === "fighter" || classId === "guard") return "protector";
  if (classId === "scout" || classId === "scholar" || classId === "tinker") return "seeker";
  if (classId === "hunter") return "survivor";
  if (classId === "acolyte") return "faithbound";
  if (classId === "rogue") return "shadow";
  return "survivor";
}

export function getTowerPathChanges(args: {
  character: Character;
  floor: FloorDefinition;
  level: FloorResultLevel;
  divineAction: DivineActionId;
  decision?: string;
  floorIntel?: FloorIntel;
}): Array<{ pathId: PathId; amount: number }> {
  const { character, floor, level, divineAction, decision, floorIntel } = args;
  const clearFloor = level === "greatSuccess" || level === "success" || level === "costlySuccess";
  const changes: Array<{ pathId: PathId; amount: number }> = [];

  if (divineAction === "blessing" && clearFloor) {
    changes.push({ pathId: "faithbound", amount: 2 });
    if (character.divine.dependency >= 50) changes.push({ pathId: "independent", amount: -1 });
  }
  if (divineAction === "whisper" && clearFloor) {
    changes.push({ pathId: "faithbound", amount: 1 });
    if (["puzzle", "moral", "npc"].includes(floor.challengeType)) changes.push({ pathId: "seeker", amount: 1 });
  }
  if (divineAction === "omen" && clearFloor) {
    changes.push({ pathId: "seeker", amount: 1 });
    if ((floor.tags ?? []).some((tag) => ["danger", "trap", "darkness", "survival"].includes(tag))) changes.push({ pathId: "survivor", amount: 1 });
  }
  if (divineAction === "silence") {
    if (clearFloor) {
      changes.push({ pathId: "independent", amount: 2 }, { pathId: "survivor", amount: 1 });
    } else {
      changes.push({ pathId: "broken", amount: 1 }, { pathId: "independent", amount: 1 });
    }
  }

  if (level === "greatSuccess") changes.push({ pathId: "survivor", amount: 1 }, { pathId: getClassRelevantPath(character.classId), amount: 1 });
  if (level === "costlySuccess") changes.push({ pathId: "survivor", amount: 2 }, { pathId: "broken", amount: 1 });
  if (level === "failure") changes.push({ pathId: "broken", amount: 1 });
  if (level === "criticalFailure") changes.push({ pathId: "broken", amount: 3 }, { pathId: "survivor", amount: 1 });

  if (floor.challengeType === "npc" && clearFloor) changes.push({ pathId: "protector", amount: 2 }, { pathId: "merciful", amount: level === "costlySuccess" ? 3 : 2 });
  if (floor.challengeType === "npc" && !clearFloor) changes.push({ pathId: "shadow", amount: 1 }, { pathId: "broken", amount: 1 });
  if (floor.floor === 10 && clearFloor) {
    changes.push({ pathId: getClassRelevantPath(character.classId), amount: 2 }, { pathId: "survivor", amount: 2 });
    if (decision === "self") changes.push({ pathId: "independent", amount: 3 });
    if (divineAction === "blessing") changes.push({ pathId: "faithbound", amount: 2 });
  }
  if (decision === "classAction" && clearFloor) changes.push({ pathId: getClassRelevantPath(character.classId), amount: 1 });
  if (floorIntel?.reliability === "trusted" && clearFloor) changes.push({ pathId: "seeker", amount: 1 });
  if (floorIntel?.isFalse) changes.push({ pathId: "broken", amount: 1 }, { pathId: "seeker", amount: 1 });
  if (character.survival.hunger >= 80) changes.push({ pathId: "survivor", amount: 2 }, { pathId: "broken", amount: 1 });

  return changes;
}

export function applyPathChangesFromEvent(gameState: GameState, eventContext: { type: "activity" | "npc" | "investigation" | "market"; outcome?: string }): { state: GameState; changes: PathAffinityChange[] } {
  if (!gameState.character) return { state: gameState, changes: [] };
  const changes: Array<{ pathId: PathId; amount: number }> = [];
  if (eventContext.type === "activity") {
    if (eventContext.outcome === "gather") {
      changes.push({ pathId: "survivor", amount: 1 });
      if (gameState.character.survival.hunger >= 80) changes.push({ pathId: "broken", amount: 1 });
    }
    if (eventContext.outcome === "train") changes.push({ pathId: getClassRelevantPath(gameState.character.classId), amount: 1 });
  }
  if (eventContext.type === "market") changes.push({ pathId: "survivor", amount: 1 }, { pathId: "seeker", amount: 1 });
  if (eventContext.type === "investigation") {
    if (eventContext.outcome === "trusted" || eventContext.outcome === "partial") changes.push({ pathId: "seeker", amount: 2 });
    if (eventContext.outcome === "false") changes.push({ pathId: "broken", amount: 1 }, { pathId: "seeker", amount: 1 });
    if (eventContext.outcome === "robbery" || eventContext.outcome === "trade") changes.push({ pathId: "survivor", amount: 1 }, { pathId: "shadow", amount: 1 });
  }
  if (eventContext.type === "npc") {
    if (eventContext.outcome === "help") changes.push({ pathId: "protector", amount: 2 }, { pathId: "merciful", amount: 2 });
    if (eventContext.outcome === "costlyHelp") changes.push({ pathId: "merciful", amount: 2 }, { pathId: "broken", amount: 1 }, { pathId: "protector", amount: 1 });
    if (eventContext.outcome === "abandon") changes.push({ pathId: "survivor", amount: 1 }, { pathId: "shadow", amount: 1 }, { pathId: "broken", amount: 1 });
  }
  const applied = applyPathChanges(gameState.character, changes);
  return { state: { ...gameState, character: applied.character }, changes: applied.changes };
}
