import { addJournalEntry } from "./gameState";
import { deathCauseLabels } from "./labels";
import { addMemory, createCollapseMemory, createHungerMemory, createSicknessMemory } from "./memorySystem";
import type { ActivityType, ChallengeType, Character, DeathCause, DeathRecord, GameState } from "../types/game";

interface SurvivalConsequenceResult {
  state: GameState;
  death?: DeathRecord;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const chance = (percent: number) => Math.random() * 100 < percent;

export function applySurvivalConsequences(state: GameState, activityType: ActivityType): SurvivalConsequenceResult {
  if (!state.character || state.ended) return { state };

  let nextState = state;
  let character: Character = structuredClone(state.character);
  const warnings: string[] = [];
  const memoriesToAdd = [];
  const { hunger, fatigue, injury, sickness } = character.survival;

  if (hunger >= 70) {
    character.survival.morale = clamp(character.survival.morale - (hunger >= 90 ? 5 : 2));
  }

  if (hunger >= 90) {
    character.survival.hope = clamp(character.survival.hope - 4);
    if (chance(hunger >= 100 ? 60 : 35)) {
      character.survival.sickness = clamp(character.survival.sickness + (hunger >= 100 ? 18 : 10));
    }
    warnings.push("ความหิวเริ่มกัดกินทั้งร่างกายและความหวังของเขา หากยังฝืนต่อไป อาการป่วยอาจตามมา");
    memoriesToAdd.push(createHungerMemory(character.currentFloor));
  }

  if (fatigue >= 70) {
    if (activityType === "tower" || activityType === "gather") {
      character.survival.injury = clamp(character.survival.injury + (fatigue >= 90 ? 8 : 3));
    }
  }

  if (fatigue >= 90) {
    character.survival.morale = clamp(character.survival.morale - 5);
    if (chance(fatigue >= 100 ? 70 : 35)) {
      character.survival.injury = clamp(character.survival.injury + 10);
      warnings.push("เขาทรุดลงเพราะความอ่อนล้า ร่างกายยังขยับได้ แต่ไม่อาจโกหกว่าปลอดภัย");
      memoriesToAdd.push(createCollapseMemory());
    } else {
      warnings.push("ร่างกายของเขาอ่อนล้าเกินไป การฝืนต่ออาจทำให้บาดเจ็บหนัก");
    }
  }

  if (fatigue >= 100) {
    character.survival.sickness = clamp(character.survival.sickness + 12);
    character.survival.injury = clamp(character.survival.injury + 8);
  }

  if (hunger >= 90 && fatigue >= 90) {
    character.survival.sickness = clamp(character.survival.sickness + 15);
    character.survival.morale = clamp(character.survival.morale - 8);
    character.survival.hope = clamp(character.survival.hope - 8);
    warnings.push("ความหิวและความเหนื่อยล้าซ้อนทับกันจนกลายเป็นเงาหนักบนลมหายใจของเขา");
  }

  if (sickness >= 70 || character.survival.sickness >= 70) {
    warnings.push("เขากำลังป่วย หากปล่อยไว้อาจถึงตาย");
    if (character.survival.sickness >= 90) memoriesToAdd.push(createSicknessMemory());
  }

  character = applyDailyConditionDecayToCharacter(character, warnings);

  nextState = { ...nextState, character };

  warnings.forEach((text) => {
    nextState = addJournalEntry(nextState, {
      title: "สัญญาณอันตราย",
      text,
    });
  });

  memoriesToAdd.forEach((memory) => {
    nextState = addMemory(nextState, memory);
    nextState = addJournalEntry(nextState, {
      title: `ความทรงจำใหม่: ${memory.title}`,
      text: memory.description,
    });
  });

  const deathCause = getDeathCause(character);
  if (!deathCause) return { state: nextState };

  const death = createDeathRecord(character, nextState.day, deathCause);
  return {
    state: {
      ...nextState,
      character: null,
      ended: true,
    },
    death,
  };
}

export function getInjuryPenalty(character: Character, context?: { challengeType?: ChallengeType; activityType?: ActivityType }): number {
  const injury = character.survival.injury;
  let penalty = 0;
  if (injury >= 70) penalty -= 20;
  else if (injury >= 40) penalty -= 8;
  if ((context?.challengeType === "combat" || context?.challengeType === "boss") && injury >= 40) penalty -= 15;
  else if ((context?.challengeType === "combat" || context?.challengeType === "boss") && injury >= 20) penalty -= 5;
  return penalty;
}

export function getSicknessPenalty(character: Character, context?: { challengeType?: ChallengeType; activityType?: ActivityType }): number {
  const sickness = character.survival.sickness;
  if (sickness >= 90) return -25;
  if (sickness >= 70) return -18;
  if (sickness >= 40) return -8;
  return 0;
}

export function getSurvivalRiskLevel(character: Character): "safe" | "warning" | "danger" | "critical" {
  const highest = Math.max(character.survival.hunger, character.survival.fatigue, character.survival.injury, character.survival.sickness);
  if (highest >= 90) return "critical";
  if (highest >= 70) return "danger";
  if (highest >= 40) return "warning";
  return "safe";
}

export function applyDailyConditionDecay(gameState: GameState): GameState {
  if (!gameState.character) return gameState;
  const warnings: string[] = [];
  const character = applyDailyConditionDecayToCharacter(structuredClone(gameState.character), warnings);
  let nextState: GameState = { ...gameState, character };
  warnings.forEach((text) => {
    nextState = addJournalEntry(nextState, {
      title: "สภาพร่างกายทรุดลง",
      text,
    });
  });
  return nextState;
}

function applyDailyConditionDecayToCharacter(character: Character, warnings: string[]): Character {
  if (character.survival.sickness >= 70) {
    character.survival.morale = clamp(character.survival.morale - 3);
    character.survival.hope = clamp(character.survival.hope - 2);
  }
  if (character.survival.hunger >= 80 && character.food === 0 && chance(35)) {
    character.survival.sickness = clamp(character.survival.sickness + 5);
  }
  if (character.survival.fatigue >= 90 && chance(35)) {
    character.survival.injury = clamp(character.survival.injury + 5);
  }
  if (character.survival.injury >= 90) warnings.push("บาดแผลของเขาอยู่ในระดับวิกฤต หากยังฝืนต่อ บาดแผลอาจพรากชีวิตไป");
  if (character.survival.sickness >= 90) warnings.push("ไข้และอาการป่วยเริ่มกลืนเสียงของเขา หากไม่รักษา อาจสายเกินไป");
  return character;
}

function getDeathCause(character: Character): DeathCause | null {
  const { hunger, fatigue, injury, sickness, hope } = character.survival;

  if (injury >= 100) return "injury";
  if (sickness >= 100) return "sickness";
  if (hunger >= 100 && sickness >= 80) return "starvation";
  if (fatigue >= 100 && injury >= 80) return "exhaustion";
  if (hope <= 0 && (moraleIsBroken(character) || hunger >= 90 || fatigue >= 90)) return "despair";
  if (hunger >= 100 && fatigue >= 100 && (injury >= 70 || sickness >= 70)) return hunger >= fatigue ? "starvation" : "exhaustion";
  if (hunger >= 100 && character.food <= 0 && (fatigue >= 90 || sickness >= 70 || chance(25))) return "starvation";
  if (fatigue >= 100 && (injury >= 80 || sickness >= 80 || chance(20))) return "exhaustion";

  return null;
}

function moraleIsBroken(character: Character): boolean {
  return character.survival.morale <= 5;
}

function createDeathRecord(character: Character, day: number, cause: DeathCause): DeathRecord {
  return {
    id: crypto.randomUUID(),
    name: character.name,
    className: character.className,
    floorReached: Math.max(character.currentFloor, character.maxFloorCleared),
    day,
    cause,
    causeText: deathCauseLabels[cause],
    message: deathMessage(cause),
  };
}

function deathMessage(cause: DeathCause): string {
  if (cause === "starvation") {
    return "ความหิวพรากเรี่ยวแรงสุดท้ายไปจากเขา ก่อนที่ประตูชั้นถัดไปจะได้เปิดออก";
  }
  if (cause === "exhaustion") {
    return "เขาไม่ได้ตายในสนามรบ แต่ค่อยๆ หายไปใต้ความเงียบของเมืองพักพิง";
  }
  if (cause === "sickness") {
    return "ไข้สูงและลมหายใจขาดห้วงพาเขาไปไกลกว่าที่เสียงกระซิบของเทพจะเอื้อมถึง";
  }
  if (cause === "injury") {
    return "บาดแผลที่ถูกปล่อยไว้นานเกินไปกลายเป็นประตูอีกบาน และครั้งนี้ไม่มีทางกลับ";
  }
  return "เทพเฝ้ามองอยู่ แต่คราวนี้ เสียงกระซิบมาช้าเกินไป";
}
